npm install swagger-ui-express  

#app.js | index.js

import swaggerUi from "swagger-ui-express";

import * as swaggerDocument from "./autochecker/swagger.json";

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));