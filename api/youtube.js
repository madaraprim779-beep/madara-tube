
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=60");

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Méthode non autorisée."
    });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      error: "La clé API manque dans les variables Vercel."
    });
  }

  const q = String(req.query.q || "tendances musique")
    .trim()
    .slice(0, 150);

  const pageToken = String(req.query.pageToken || "").slice(0, 200);

  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    q,
    maxResults: "20",
    regionCode: "CI",
    relevanceLanguage: "fr",
    safeSearch: "moderate"
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  try {
    const response = await fetch(
      "https://www.googleapis.com/youtube/v3/search?" +
      params.toString()
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error:
          data?.error?.message ||
          "La recherche YouTube a échoué."
      });
    }

    const videos = (data.items || [])
      .filter(item => item.id?.videoId)
      .map(item => ({
        videoId: item.id.videoId,
        title: item.snippet?.title || "Vidéo sans titre",
        description: item.snippet?.description || "",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
        channelTitle: item.snippet?.channelTitle || "Chaîne YouTube",
        publishedAt: item.snippet?.publishedAt || ""
      }));

    return res.status(200).json({
      success: true,
      query: q,
      count: videos.length,
      videos,
      nextPageToken: data.nextPageToken || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Impossible de contacter YouTube pour le moment."
    });
  }
}
