npm install swagger-ui-express  

#app.js | index.js

import swaggerUi from "swagger-ui-express";

import * as swaggerDocument from "./autochecker/swagger.json";

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

Example utilisation [https://github.com/Frank14b/smartfarm_api]https://github.com/Frank14b/smartfarm_api