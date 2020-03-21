import { NowRequest, NowResponse } from "@now/node";
import Parser from "rss-parser";

const CACHE_MINUTES = 15;

const INVALID_REQUEST_ERROR = {
  error: "Please provide a userId and shelf in the query parameters",
  exampleRequest: "/?userId=982451924&shelf=test"
};

const UNEXPECTED_ERROR = {
  error: "Unexpected error occured"
};

module.exports = async (req: NowRequest, res: NowResponse) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  let query = req.query;
  if (!query || !query.userId || !query.shelf) {
    res.status(400).end(JSON.stringify(INVALID_REQUEST_ERROR));
    return;
  }

  try {
    let userId = Array.isArray(query.userId)
      ? query.userId.join("")
      : query.userId;
    let shelfName = Array.isArray(query.shelf)
      ? query.shelf.join("")
      : query.shelf;

    let rssFeedUrl = `https://www.goodreads.com/review/list_rss/${userId}?shelf=${shelfName}`;

    let rssParser = new Parser({
      customFields: {
        item: [
          "isbn",
          "book_description",
          "book_small_image_url",
          "book_medium_image_url",
          "book_large_image_url",
          "author_name",
          "average_rating",
          "book_published",
          "book",
          "book_id"
        ]
      }
    });
    let feed = await rssParser.parseURL(rssFeedUrl);

    let cleanedFeed = {
      count: feed.items.length,
      items: feed.items.map(item => {
        return {
          id: item.book_id,
          isbn: item.isbn,
          title: item.title || "",
          description: item.book_description || "",
          image: {
            small: item.book_small_image_url || "",
            medium: item.book_medium_image_url || "",
            large: item.book_large_image_url || ""
          },
          published: item.book_published,
          author: item.author_name || "",
          rating: parseFloat(item.average_rating),
          pages: parseInt(item.book ? item.book.num_pages[0] : "0", 10)
        };
      })
    };

    // Only cache successful results
    res.setHeader("Cache-Control", `public, max-age=${CACHE_MINUTES * 60}`);
    res.end(JSON.stringify(cleanedFeed));
  } catch (e) {
    return res.status(400).end(JSON.stringify(UNEXPECTED_ERROR));
  }
};
