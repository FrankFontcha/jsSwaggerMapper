## How to use

Install Swagger UI into your project

```bash
npm install swagger-ui-express  
```

Setup your project with swagger UI in app.js | index.js

```bash
import swaggerUi from "swagger-ui-express";

import * as swaggerDocument from "./jsSwaggerMapper/swagger.json";

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

Clone the repos in your project root folder

```bash
git clone https://github.com/FrankFontcha/jsSwaggerMapper.git
```

Navigate into the Swagger Mapper root folder and run

```bash
npm install
```

Run the command into jsSwaggerMapper folder to generate your swagger docs

```bash
node index.js
```


Example utilisation [https://github.com/Frank14b/smartfarm_api](https://github.com/Frank14b/smartfarm_api)