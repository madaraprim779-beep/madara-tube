
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Méthode non autorisée"
    });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "YOUTUBE_API_KEY manque dans les variables Vercel."
    });
  }

  const query = String(req.query?.q || "").trim();
  const pageToken = String(req.query?.pageToken || "").trim();

  if (!query) {
    return res.status(400).json({
      error: "Entre un mot-clé de recherche."
    });
  }

  if (query.length > 150) {
    return res.status(400).json({
      error: "La recherche est trop longue."
    });
  }

  try {
    const url = new URL(
      "https://www.googleapis.com/youtube/v3/search"
    );

    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "20");
    url.searchParams.set("safeSearch", "moderate");
    url.searchParams.set("regionCode", "CI");
    url.searchParams.set("relevanceLanguage", "fr");
    url.searchParams.set("key", apiKey);

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API:", data.error?.message);

      return res.status(502).json({
        error: "La recherche YouTube a échoué.",
        details: data.error?.message || "Vérifie ta clé, les restrictions et le quota."
      });
    }

    const videos = (data.items || [])
      .filter(item => item.id?.videoId)
      .map(item => ({
        id: item.id.videoId,
        title: item.snippet?.title || "",
        description: item.snippet?.description || "",
        channelTitle: item.snippet?.channelTitle || "",
        publishedAt: item.snippet?.publishedAt || "",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
        url: "https://www.youtube.com/watch?v=" +
          encodeURIComponent(item.id.videoId)
      }));

    return res.status(200).json({
      success: true,
      query,
      count: videos.length,
      videos,
      nextPageToken: data.nextPageToken || null
    });

  } catch (error) {
    console.error("Erreur serveur:", error.message);

    return res.status(500).json({
      error: "Impossible de contacter YouTube."
    });
  }
}
