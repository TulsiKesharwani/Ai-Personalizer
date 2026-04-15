import * as cheerio from "cheerio";

export interface ScrapedPage {
  url: string;
  finalUrl: string;
  html: string;
  title: string;
  description: string;
  bodyText: string;
}

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function scrapeLandingPage(url: string): Promise<ScrapedPage> {
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch landing page: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const finalUrl = res.url || url;
  const $ = cheerio.load(html);

  $("script, noscript").remove();

  const base = new URL(finalUrl);

  $("a[href], link[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href && !href.startsWith("http") && !href.startsWith("data:") && !href.startsWith("#") && !href.startsWith("mailto:")) {
      try {
        $(el).attr("href", new URL(href, base).toString());
      } catch {}
    }
  });
  $("img[src], source[src], script[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src && !src.startsWith("http") && !src.startsWith("data:")) {
      try {
        $(el).attr("src", new URL(src, base).toString());
      } catch {}
    }
  });
  $("img[srcset], source[srcset]").each((_, el) => {
    const srcset = $(el).attr("srcset");
    if (srcset) {
      const abs = srcset
        .split(",")
        .map((part) => {
          const [u, d] = part.trim().split(/\s+/, 2);
          if (!u || u.startsWith("http") || u.startsWith("data:")) return part.trim();
          try {
            return `${new URL(u, base).toString()}${d ? " " + d : ""}`;
          } catch {
            return part.trim();
          }
        })
        .join(", ");
      $(el).attr("srcset", abs);
    }
  });

  if (!$("base").length) {
    $("head").prepend(`<base href="${base.origin}${base.pathname}">`);
  }

  const title = $("title").first().text().trim() || "";
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000);

  return {
    url,
    finalUrl,
    html: $.html(),
    title,
    description,
    bodyText,
  };
}

export async function fetchImageAsBase64(
  url: string
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ad image: ${res.status}`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mimeType };
}
