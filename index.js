const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const app = express();
const port = 8000;

app.use(cors());
app.use(bodyParser.json());

const clients = {
    clientId123: {
        clientSecret: 'secret123',
        scopes: ['read', 'write'],
    },
};

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const TOKEN_EXPIRY = 3600;

app.post('/oauth/token', (req, res) => {
    console.log(req.body);
    console.log(req.headers);
    const { client_id, client_secret } = req.body;


    const client = clients[client_id];
    if (!client || client.clientSecret !== client_secret) {
        return res.status(401).json({ error: 'Invalid client credentials' });
    }
    const token = jwt.sign(
        {
            clientId: client_id,
            scopes: client.scopes,
        },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );

    return res.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: TOKEN_EXPIRY,
    });
});

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];


    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }


        req.client = decoded;
        next();
    });
};

app.get('/', (req, res) => {
    res.json({ message: "Hello World" });
});


app.get('/mappings', async (req, res) => {
    try {
        const data = await fs.readFile('mappings.json', 'utf-8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error("Error reading mappings.json:", err);
        res.status(500).send("Error loading mappings data");
    }
});

app.get('/dataProviders', (req, res) => {
    res.json({
        ext_data_provider_id: 101,
        ext_data_provider_code: "DNB",
        ext_data_provider_name: "Dun and Bradstreet",
        primary_flag: "Y",
        enabled_flag: "Y",
        search_api_url: "autoSuggest",
        company_name_provider_attr: "organization.primaryName",
        provider_attribute1: "organization.iconUrl",
        provider_attribute2: "organization.duns",
        provider_attribute3: "organization.primaryAddress.addressRegion.name",
        provider_attribute4: null,
        provider_attribute5: null,
        provider_identifier: "organization.duns",
        search_candidates: "searchCandidates"
    });
});

app.use(verifyToken);

app.get('/autoSuggest', async (req, res) => {
    const searchText = req.query.searchText ? req.query.searchText.toLowerCase() : null;


    try {
        const data = await fs.readFile('companies.json', 'utf-8');
        const companies = JSON.parse(data)["comp"];

        if (searchText) {
            const results = companies.filter(val =>
                val.organization.primaryName.toLowerCase().includes(searchText)
            );

            res.json({
                transactionDetail: {
                    transactionID: "rrt-051d25cbd8f15f5a9-b-ea-20648-54309783-3",
                    transactionTimestamp: "2018-02-28T17:11:06.454Z",
                    inLanguage: "en-US",
                    serviceVersion: "1"
                },
                inquiryDetail: {
                    countryISOAlpha2Code: "US",
                    searchTerm: searchText
                },
                candidatesReturnedQuantity: results.length,
                candidatesMatchedQuantity: 23,
                searchCandidates: results
            });
        } else {
            res.json({
                transactionDetail: {
                    transactionID: "rrt-051d25cbd8f15f5a9-b-ea-20648-54309783-3",
                    transactionTimestamp: "2018-02-28T17:11:06.454Z",
                    inLanguage: "en-US",
                    serviceVersion: "1"
                },
                inquiryDetail: {
                    countryISOAlpha2Code: "US",
                    searchTerm: searchText
                },
                candidatesReturnedQuantity: 0,
                candidatesMatchedQuantity: 23,
                searchCandidates: []
            });
        }
    } catch (err) {
        console.error("Error reading companies.json:", err);
        res.status(500).send("Error loading companies data");
    }
});

app.get('/v1/data/duns/:dunsNumber', async (req, res) => {
    const dunsNumber = req.params.dunsNumber;
    const blockIDs = req.query.blockIDs;

    if (!blockIDs) {
        res.status(400).json({ msg: "BlockIds missing" });
    } else {
        try {
            const data = await fs.readFile('dataBlocks-sample.json', 'utf-8');
            const parsedData = JSON.parse(data);

            res.json(parsedData[dunsNumber]);
        } catch (err) {
            console.error("Error reading dataBlocks-sample.json:", err);
            res.status(500).send("Error loading company data");
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
