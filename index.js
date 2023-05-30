const path = require('path');
const dataConfig = require('./configs.json');
const dataPackage = require('../package.json');
const fs = require('fs');

const typeExamples = {
    "string": "example",
    "number": 1,
    "boolean": true,
    "date": new Date()
}

function browseModels() {
    //get models directory
    // const folderPath = __dirname + dataConfig.models.path

    //get models files
    const filesModels = getModelFiles()

    //get DTOs files
    const filesDtos = getDtoFiles()

    //get routes files
    const routes = getRouteFiles();

    let arrayAllLines = [];
    let arrayMethodLines = [];

    for (const route of routes[0]) {

        const fileContent = fs.readFileSync(routes[1] + route, 'utf8');
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

                let tmp_arrayAllLines = arrayAllLines.reverse();

                let summary, name, params, result, tagname, queries = null;

                tmp_arrayAllLines.forEach((element, index) => {
                    if (element.includes("startJsAM")) {
                        tmp_arrayAllLines = arrayAllLines = [];
                    }

                    if (element.toLowerCase().includes("@summary")) {
                        summary = (element.split(":")[1] ?? "").trim()
                    }
                    if (element.toLowerCase().includes("@name")) {
                        name = (element.split(":")[1] ?? "").trim()
                    }
                    if (element.toLowerCase().includes("@params") && method != "get") {
                        params = (element.split(":")[1] ?? "").trim()
                        params = getRouteDtoData(params, filesDtos);
                    }
                    if (element.toLowerCase().includes("@query")) {
                        queries = (element.split(":")[1] ?? "").trim()
                        queries = getRouteDtoData(queries, filesDtos, true);
                    }
                    if (element.toLowerCase().includes("@result")) {
                        result = (element.split(":")[1] ?? "").trim()
                        result = getRouteDtoData(result, filesDtos);
                    }
                    if (element.toLowerCase().includes("@tag")) {
                        tagname = (element.split(":")[1] ?? "").trim()
                    }
                });

                arrayMethodLines.push({
                    "url": url,
                    "method": method,
                    "line": lines,
                    "name": name ?? "",
                    "summary": summary ?? "",
                    "params": params ?? "",
                    "result": result ?? "",
                    "bodyRequired": params ? true : false,
                    "tagname": tagname ?? "",
                    "queries": queries ?? "",
                    "isQueries": queries ? true : false,
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

    if (params['bodyRequired']) { }

    const path = `
        "${params['url']}": {
          "${params['method']}": {
            "tags": ["${params['tagname']}"],
            "summary": "${params['name']}",
            "description": "${params['summary']}",
            ${getRequestQueriesParams(params)}
            ${getRequestBody(params)}
            "responses": {
                "200": {
                  "description": "",
                  "content": {
                    "${dataConfig.responseType}": {
                      "schema": {
                        "properties": {${params['result']}}
                      }
                    }
                  }
                }
            }
          }
        }`

    return path;
}

function getRequestBody(params) {
    let body = `"requestBody": {
        "required": ${params['bodyRequired']},
        "content": {
          "${dataConfig.requestType}": {
            "schema": {
                "properties": {${params['params']}}
            }
          }
        }
    },`

    if (!params['bodyRequired']) {
        body = ""
    }

    return body;
}

function getRequestQueriesParams(params) {
    let query = `"parameters": [${params['queries']}],`

    if (!params['isQueries']) {
        query = ""
    }

    return query;
}

function swaggerStruct(datas) {
    const content = `{
        "openapi": "${dataConfig.swaggerversion}",
        "info": {
          "title": "${dataPackage?.description}",
          "version": "${dataPackage?.version}"
        },
        "schemes": ["http"],
        "servers": [{ "url": "${dataConfig.baseUrl}" }],
        ${addApiAuthorization()}
        "paths": {${datas}}
    }`

    return content;
}

function addApiAuthorization() {
    const headerAuth = dataConfig.headers.find((x) => x.name.toLowerCase() == "authorization")

    if (headerAuth && headerAuth.type == "jwt") {
        const Auth = `
        "components": {
            "securitySchemes": {
              "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT"
              }
            }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ],`
        return Auth
    } else if (headerAuth && headerAuth.type == "basic") {
        const Auth = `
        "components": {
            "securitySchemes": {
              "basicAuth": {
                "type": "http",
                "scheme": "basic"
              }
            }
        },
        "security": [
            {
              "basicAuth": []
            }
        ],`
        return Auth
    }

    return ""
}

function getDtoFiles() {
    const dtosPath = "../" + dataConfig.dtos.path + "/";
    const files = fs.readdirSync(dtosPath);
    return [files, dtosPath];
}

function getModelFiles() {
    const modelsPath = "../" + dataConfig.models.path + "/";
    const files = fs.readdirSync(modelsPath);
    return [files, modelsPath];
}

function getRouteFiles() {
    const routesPath = "../" + dataConfig.routes.path + "/";
    const files = fs.readdirSync(routesPath);
    return [files, routesPath];
}

function getRouteDtoData(dtoName = "", files, isQueries = false) {
    dtoName = dtoName.replace("", "").trim()
    let params = ``;

    let startLineKeyword = (dataConfig.extention == "ts") ? "exporttype" : "={";

    if (dtoName.length > 0) {

        files[0].forEach((element, index) => {
            const fileContent = fs.readFileSync(files[1] + element, 'utf8');
            const lines = fileContent.split('\n');

            let allDtosStartLinesNumbers = [];
            let allDtosStartLines = [];

            lines.forEach((__line, _index) => {
                if (__line !== '') {
                    let tmp_line;

                    tmp_line = __line.toLowerCase().replaceAll(" ", "")
                    allDtosStartLines.push(__line)

                    if (tmp_line.match(startLineKeyword)) {
                        allDtosStartLinesNumbers.push(_index)
                    }
                }
            })

            // console.log("allDtosStartLinesNumbers", allDtosStartLinesNumbers)

            lines.forEach((_line, index) => {

                let line, prefix = "";

                if (dataConfig.extention == "ts") {
                    prefix = "exporttype"
                }

                line = _line.toLowerCase().replaceAll(" ", "")

                if (line.match(prefix + dtoName.toLowerCase())) {

                    params += getDtoFromLines(allDtosStartLines, index + 1, startLineKeyword, isQueries)
                }

            })

        });

        return params
    }

    return "";
}

function getDtoFromLines(allDtosStartLines, index, startLineKeyword, isQueries = false) {

    let limitReach = false;
    let initial = 0;
    let params2 = ``;

    for (let i = index; i <= allDtosStartLines.length - 1; i++) {
        index += 1;

        if (!limitReach) {

            if (allDtosStartLines[i].replaceAll(" ", "").trim() == "}") {
                limitReach = true
                initial = 0
            } else {

                let _data = allDtosStartLines[i].split(":")

                if (_data[1] && _data[1].match("{")) {

                    let _data0 = _data[0].trim();

                    if (_data0.toLowerCase().replaceAll(" ", "".length > 0)) {

                        allDtosStartLines[i] = ""

                        let objectData = getDtoFromLines(allDtosStartLines, index, params2);

                        if (initial > 0) params2 += `,`

                        if (isQueries) {
                            params2 += `${objectData}`
                        } else {
                            params2 += `
                            "${_data0}": {
                                "type" : "object",
                                "properties": {${objectData}
                            `
                        }

                        initial += 1
                    }

                } else {

                    let _data0 = _data[0].trim();
                    let _checkdata0 = _data0.toLowerCase().replaceAll(" ", "")

                    if (_checkdata0.length > 0 && !["}", "},"].includes(_checkdata0)) {
                        let type = _data[1]?.toLowerCase().trim().replaceAll(",", "")
                        let typeExamplesValues = Object.values(typeExamples)
                        let typeExamplesLabel = Object.keys(typeExamples)
                        let indexType = typeExamplesLabel.findIndex(__type => __type == type);

                        let finalTypeValue = typeExamplesValues[indexType]
                        if (_data0.toLowerCase() == "email") {
                            finalTypeValue = "example@test.com"
                        }
                        if (_data0.toLowerCase().match("password")) {
                            finalTypeValue = generateRandomPassword(12)
                        }

                        allDtosStartLines[i] = ""

                        if (initial > 0) params2 += `,`

                        if(isQueries) {
                            params2 += `
                            {
                                "name": "${_data0}",
                                "in": "query",
                                "schema": {
                                  "type": "${type}"
                                },
                                "description": "",
                                "required": false
                            }`
                        }else{
                            params2 += `
                            "${_data0}": {
                                "type" : "${type}",
                                "example" : "${finalTypeValue}"
                            }`
                        }
                        

                        if (allDtosStartLines[i + 1].replaceAll(" ", "").trim() == "}," ||
                            (allDtosStartLines[i + 1].replaceAll(" ", "").trim() == "}" && allDtosStartLines[i + 2] && allDtosStartLines[i + 2].replaceAll(" ", "").trim() == "}")
                            // (allDtosStartLines[i + 1].replaceAll(" ", "").trim() == "}" && allDtosStartLines[i + 2] && allDtosStartLines[i + 2].toLowerCase().replaceAll(" ", "").trim().match(startLineKeyword))
                        ) {

                            params2 += `}}`
                        }

                        initial += 1
                    } else {

                    }

                }
            }
        }
    }

    return params2;
}

function generateRandomPassword(length) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+{}[]:<>,.?";
    const password = [];

    for (let i = 0; i < length; i++) {
        password.push(chars[Math.floor(Math.random() * chars.length)]);
    }

    return password.join("");
}