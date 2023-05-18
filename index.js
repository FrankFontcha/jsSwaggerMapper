const path = require('path');
const dataConfig = require('./configs.json');
const dataPackage = require('../package.json');
const fs = require('fs');

function browseModels() {
    //get models directory
    const folderPath = __dirname + dataConfig.models.path

    //get models files
    const files = fs.readdirSync("../" + dataConfig.models.path + "/");

    //get routes files
    const path = "../" + dataConfig.routes.path + "/";
    const routes = fs.readdirSync(path);
    let arrayAllLines = [];
    let arrayMethodLines = [];

    for (const route of routes) {

        const fileContent = fs.readFileSync(path + route, 'utf8');
        const lines = fileContent.split('\n');
        const appName = dataConfig.routes.appName.toLowerCase()

        lines.forEach((_line, index) => {

            let method = "";
            let methodParamKey = "";
            let url = "";

            let line = _line.toLowerCase().replaceAll(" ", "").replaceAll(",function", ",")

            arrayAllLines.push(_line);

            if (line.includes(appName + ".")) {
                if (line.includes(appName + ".post(")) {
                    methodParamKey = appName + ".post("
                    method = "post";
                } else if (line.includes(appName + ".get(")) {
                    methodParamKey = appName + ".get("
                    method = "get";
                } else if (line.includes(appName + ".put(")) {
                    methodParamKey = appName + ".put("
                    method = "put";
                } else if (line.includes(appName + ".delete(")) {
                    methodParamKey = appName + ".delete("
                    method = "delete";
                }

                const urlStart = line.indexOf('(') + 2;
                const urlEnd = line.indexOf(',(') - 1;
                url = line.substring(urlStart, urlEnd);

                let tmp_arrayAllLines = arrayAllLines;

                let summary = "";
                let name = "";

                tmp_arrayAllLines.forEach((element, index) => {
                    if (element.includes("/*start")) {
                        summary = "";
                        name = "";
                    }

                    if (element.toLowerCase().includes("@summary")) {
                        summary = element.split(":")[1] ?? ""
                        summary = summary.trim()
                    }
                    if (element.toLowerCase().includes("@name")) {
                        name = element.split(":")[1] ?? ""
                        name = name.trim()
                    }
                });

                arrayMethodLines.push({
                    "url": url,
                    "method": method,
                    "line": lines,
                    "name": name,
                    "summary": summary
                })
            }

            return;
        })
    }

    let params = "";
    let count = 0;

    for (const param of arrayMethodLines) {
        count++
        params += swaggerPaths(param, "")
        if (count < arrayMethodLines.length) {
            params += ","
        }
    }

    const swaggerObject = swaggerStruct(params)


    fs.writeFileSync("./swagger.json", swaggerObject, 'utf8');

    fs.writeFileSync("./test.txt", JSON.stringify(arrayAllLines), 'utf8');
}

browseModels()

function swaggerPaths(params, body) {

    let path = `
        "${params['url']}": {
          "${params['method']}": {
            "tags": ["${params['url']}"],
            "summary": "${params['name']}",
            "description": "${params['summary']}",
            "responses": {
                "200": {
                  "description": "A hello message",
                  "content": {
                    "${dataConfig.requestType}": {
                      "schema": {
                        "type": "string"
                      }
                    }
                  }
                }
            }
          }
        }`

    return path;
}

function swaggerStruct(datas) {
    let content = `{
        "openapi": "${dataConfig.swaggerversion}",
        "info": {
          "title": "${dataPackage?.description}",
          "version": "${dataPackage?.version}"
        },
        "schemes": ["http"],
        "servers": [{ "url": "${dataConfig.baseUrl}" }],
        "paths": {${datas}}
    }`

    return content;
}