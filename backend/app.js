import express, { json, urlencoded } from 'express';
// import axios from 'axios';
import cors from 'cors';
import { createWriteStream } from 'fs';
import morgan from 'morgan';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { getJson } from "serpapi";
import { info } from './Utils/logger.js';
import axios from 'axios';

const app = express();
const host = 'localhost';
const port = process.env.PORT || 5001;

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());

//logging setup
var accessLogStream = createWriteStream(join('./logs/access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// SerpApi route
app.get("/search", async (req, res) => {
    const { keywords, platform } = req.query;

    const extractNameFromSource = (source) => {
        const nameMatch = source.match(/·\s*([\w'-]+)\s+(.+)/);
        return nameMatch
            ? { firstName: nameMatch[1], lastName: nameMatch[2] }
            : { firstName: "Unknown", lastName: "" };
    };

    if (!keywords || !platform) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const site = platform === "linkedin"
        ? "linkedin.com/in"
        : platform === "twitter"
            ? "twitter.com"
            : "instagram.com";

    const query = `site:${site} "${keywords}"`;

    try {
        const response = await getJson({
            api_key: process.env.SERPAPI_KEY,
            engine: "google",
            q: query,
            output: "json",
            num: 20,
            caches: "clear"
        });
        // console.log(response?.organic_results);

        if (!response.organic_results) {
            return res.status(404).json({ error: "No results found" });
        }

        const results = response.organic_results.map((result) => ({
            title: result.title,
            first_name: extractNameFromSource(result.source).firstName,
            last_name: extractNameFromSource(result.source).lastName,
            url: result.link,
            platform: platform,
            snippet: result.snippet || "No description available",
        }));

        res.json(results);
    } catch (error) {
        console.error("SerpAPI error:", error.response?.data || error.message);
        res.status(500).json({ error: "SerpAPI request failed" });
    }
});

// APOLLO route
app.post('/api/search-email', async (req, res) => {
    const { name, domain } = req.body;

    if (!process.env.APOLLO_API_KEY) {
        return res.status(500).json({ error: 'Apollo API key is missing' });
    }

    try {
        const response = await axios.post('https://api.apollo.io/api/v1/mixed_people/search', {
            api_key: process.env.APOLLO_API_KEY,
            q_organization_domains: [domain],
            q_names: [name],
            page: 1
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.APOLLO_API_KEY
            }
        });

        res.json({ email: response.data.person?.email || null });
    } catch (error) {
        console.error('Apollo API error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch from Apollo' });
    }
});

// HUNTER route
app.post('/api/find-email', async (req, res) => {
    const { domain } = req.body;
    if (!process.env.HUNTER_API_KEY) {
        return res.status(500).json({ error: 'Hunter.io API key is missing' });
    }

    try {
        let response = await axios.get(`https://api.hunter.io/v2/domain-search`, {
                params: {
                    domain,
                    api_key: process.env.HUNTER_API_KEY
                }
            });
        // console.log(JSON.stringify(response?.data?.data?.emails));

        res.json({ email: response?.data?.data?.emails || null });
    } catch (error) {
        console.error('Hunter.io API error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch from Hunter.io' });
    }
});


// Server listen setup
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
    info(`Server started and running on http://${host}:${port}`);
});
