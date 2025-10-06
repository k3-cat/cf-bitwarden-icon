import { Hono } from "hono";

const app = new Hono();

const POSITIVE_CACHE = "public, max-age 604800, only-if-cached, stale-while-revalidate 259200";
const NEGATIVE_CACHE = "public, max-age 7776000, only-if-cached, stale-while-revalidate 259200";

app.get("/icons/:domain/icon.png", async (c) => {
	let domain = c.req.param("domain");
	let url = new URL(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
	let icon = await fetch(url, { redirect: "follow" });

	if (!icon.body) {
		return c.text(`[BI-FI] unknown error. (ray: ${c.req.header("cf-ray")})`);
	}

	if (icon.ok) {
		c.res.headers.set("Cache-Control", POSITIVE_CACHE);
	} else {
		c.res.headers.set("Cache-Control", NEGATIVE_CACHE);
	}
	let etag = icon.headers.get("Etag");
	if (etag) {
		c.res.headers.set("Etag", etag);
	}
	c.res.status = icon.status;
	c.res.headers.set("Content-Type", icon.headers.get("Content-Type")!);
	return c.body(icon.body);
});

app.get("*", async (c) => {
	return c.text(`[BI] path '${c.req.path}' is not found. (ray: ${c.req.header("cf-ray")})`);
});

export default app;
