import { Hono } from "hono";
import { cache } from "hono/cache";
import { every } from "hono/combine";
import { etag } from "hono/etag";
import { StatusCode } from "hono/utils/http-status";

const app = new Hono();

const POSITIVE_AGE = 1209600;
const NEGATIVE_AGE = 7776000;
const POSITIVE_CACHE = `public, max-age ${POSITIVE_AGE}, immutable`;
const NEGATIVE_CACHE = `public, max-age ${NEGATIVE_AGE}, immutable`;

app.get(
	"/icons/*",
	every(
		cache({
			cacheName: "bi-icons",
			cacheableStatusCodes: [200, 301, 308, 404],
		}),
		etag(),
	),
);

app.get("/icons/:domain/icon.png", async (c) => {
	const domain = c.req.param("domain");
	return c.redirect(`/icons/${domain}/favicon.ico`, 301);
});

app.get("/icons/:domain/favicon.ico", async (c) => {
	const domain = c.req.param("domain");
	const url = new URL(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
	const icon = await fetch(url, {
		headers: c.req.raw.headers,
		redirect: "follow",
	});

	if (!icon.body) {
		return c.text(`[BI-FI] null res body from upstream. (ray: ${c.req.header("cf-ray")})`);
	}

	const now = new Date();
	c.status(icon.status as StatusCode);
	c.header("content-type", "image/x-icon");
	c.header("last-modified", now.toUTCString());

	if (icon.ok) {
		c.header("cache-control", POSITIVE_CACHE);
		c.header("expires", new Date((now.getSeconds() + POSITIVE_AGE) * 1000).toUTCString());
	} else {
		c.header("cache-control", NEGATIVE_CACHE);
		c.header("expires", new Date((now.getSeconds() + NEGATIVE_AGE) * 1000).toUTCString());
	}

	let etag = icon.headers.get("etag");
	if (etag) {
		c.header("etag", etag);
	}

	return c.body(icon.body);
});

app.get("*", async (c) => {
	return c.text(`[BI] path '${c.req.path}' is not found. (ray: ${c.req.header("cf-ray")})`);
});

export default app;
