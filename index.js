const path = require('path');
const dataConfig = require('./configs.json');
const dataPackage = require('../package.json');
const fs = require('fs');

const typeExamples = {
    "string": "example",
    "number": 12345678,
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

                let summary, name, params, result = "";

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
                    if (element.toLowerCase().includes("@params")) {
                        params = (element.split(":")[1] ?? "").trim()
                        params = getRouteDtoData(params, filesDtos);
                    }
                    if (element.toLowerCase().includes("@result")) {
                        result = (element.split(":")[1] ?? "").trim()
                        result = getRouteDtoData(result, filesDtos);
                    }
                });

                arrayMethodLines.push({
                    "url": url,
                    "method": method,
                    "line": lines,
                    "name": name,
                    "summary": summary,
                    "params": params ?? "",
                    "result": result ?? ""
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
            "requestBody": {
                "required": true,
                "content": {
                  "application/json": {
                    "schema": {
                        "properties": {${params['params']}}
                    }
                  }
                }
            },
            "responses": {
                "200": {
                  "description": "",
                  "content": {
                    "${dataConfig.requestType}": {
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

function getRouteDtoData(dtoName = "", files) {
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
                let tmp_line;

                tmp_line = __line.toLowerCase().replaceAll(" ", "")
                allDtosStartLines.push(__line)

                if (tmp_line.match(startLineKeyword)) {
                    allDtosStartLinesNumbers.push(_index)
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

                    params += getDtoFromLines(allDtosStartLines, index + 1, params)
                }

            })

        });

        return params
    }

    return "";
}

function getDtoFromLines(allDtosStartLines, index, params) {

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
                        params2 += `
                        "${_data0}": {
                            "type" : "object",
                            "properties": {${objectData}
                        `
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
                        params2 += `
                        "${_data0}": {
                            "type" : "${type}",
                            "example" : "${finalTypeValue}"
                        }`

                        if (allDtosStartLines[i + 1].replaceAll(" ", "").trim() == "},") {
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