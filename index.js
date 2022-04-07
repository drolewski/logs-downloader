#!/usr/bin/env node

import inquirer from "inquirer";
import chalkAnimation from "chalk-animation";
import {createSpinner} from "nanospinner";
import fetch from "node-fetch";
import fs from "fs";


process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0

const mbankLogs = "https://sw-rrev-pl.mbank.pl/";
const dlaCdParam = "dla_cd/";

let filesUrl = mbankLogs + dlaCdParam;
let filename;

const sleep = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

async function start() {
    chalkAnimation.rainbow(
        'Mbank Logs Downloader \n'
    );
    await sleep();
}

async function handleAnswer(url) {
    const spinner = createSpinner('Downloading directory...').start();
    let html;
    let responseStatus;
    await fetch(url)
        .then(response => {
            responseStatus = response.status;
            return response.text();
        })
        .then(text => html = text);

    if (responseStatus === 200) {
        spinner.success({text: "Directory downloaded..."});
        return html;
    }
    spinner.error({text: "Error while downloading directory... "});
    process.exit(1);
}

async function getPage(url) {
    const html = await handleAnswer(url);
    const matchedFiles = html.match(/(href=".*\/"|href=".*(log|out|txt|zip|gz))/g);
    const urls = matchedFiles.map(href => href.match(/href="(.*)"/)[1]);
    if (filesUrl !== mbankLogs + dlaCdParam) {
        urls[0] = "../";
    } else {
        urls.shift();
    }
    return urls;
}

async function getFiles() {
    let files = await getPage(filesUrl);

    const environment = await inquirer.prompt({
        name: 'file',
        type: 'list',
        message: 'Wybierz katalog lub plik',
        choices: files
    });

    if (environment.file.slice(-1) === '/') {
        filesUrl += environment.file;
        return;
    }
    filename = environment.file;
}

async function downloadFile() {
    const spinner = createSpinner('Downloading file...').start();
    const response = await fetch(filesUrl + filename);
    const fileStream = fs.createWriteStream("./logs/" + filename);
    await new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
    spinner.success({text: "File downloaded..."});
    filename = null;
}

await start();
while (true) {
    if (filename) {
        await downloadFile();
        continue;
    }
    await getFiles();
}
