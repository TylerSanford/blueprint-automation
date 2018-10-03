const fs = require('fs');
const rl = require('readline-sync');
const shell = require('node-powershell');

const testFolder = process.argv[2];
const sapCode = testFolder.split('_')[0].split('-')[1].substr(1);
const oldCode = testFolder.split(' ')[1].substr(1).match(/[a-zA-Z]+|[0-9]+/g).join('0');
// Add check if folder oldCode is == old file oldCode


const counterScan = (type, year) => {
    let currentCounter = 0;

    const reg = new RegExp(`([${type}]{1})-(\\d{5}\\w{2}\\d{4})-(${year})-(\\d{1,})`);
    const files = fs.readdirSync(testFolder).filter(text => {
        return reg.test(text);
    });

    if (files.length > 0) {
        for (let i in files) {
            if (files[i].split('-')[3].split('.')[0] > currentCounter) {
                currentCounter = Number(files[i].split('-')[3].split('.')[0]) + 1;
            }
        }
    } else {
        currentCounter = 1;
    }

    return currentCounter;
};


const powershellFunction = (fileName) => {
    let spawn = require("child_process").spawn, child;

    child = spawn("powershell.exe", [`start "${fileName}"`]);

    child.stdout.on("data", function (data) {
        console.log("Powershell Data: " + data);
    });
    child.stderr.on("data", function (data) {
        console.log("Powershell Errors: " + data);
    });
    child.on("exit", function () {
        console.log("Powershell Script finished");
    });
    child.stdin.end();
};


const renameFunction = (fileName, newLabelName, newFileName) => {
    console.log("Rename current Filename = " + fileName);
    console.log("Rename newLabelName = " + newLabelName);
    console.log("Rename newFileName = " + newFileName);

    try {
        fs.renameSync(fileName, `${testFolder}/${newFileName}.pdf`, function (err) {
            if (err) throw err;
            console.log(filename + " => " + newFileName + " - Success!");

        });
    }
    catch (err) {
        throw err;
    }
};


const questionFunction = (fileName) => {
    powershellFunction(fileName);

    console.log(fileName);

    let type = rl.question("What file TYPE (C, E, I, M, F)? ");
    let year = rl.question("What is the file YEAR? ");
    let description = rl.question("What is the file DESCRIPTION? ");

    let currentCounter = (counterScan(type, year));
    console.log(currentCounter);

    let newLabelName = `${type}-${sapCode}${oldCode}-${year}-${currentCounter}`;
    let newFileName = `${type}-${sapCode}${oldCode}-${year}-${currentCounter} ${description}`;

    renameFunction(fileName, newLabelName, newFileName);
};


const scanCurrentDirectory = (currentPath) => {
    // Remove completed files from files array
    //const files = fs.readdirSync(currentPath).filter(function (text) {
    //    return !/([CEIFM]{1})-(\d{5}\w{2}\d{4})-(\d{4})-(\d{1,})/.test(text);
    //});

    //for (let i in files) {
    //    let currentFile = `${testFolder}/${files[i]}`;
    //    let stats = fs.statSync(currentFile);

    //    if (stats.isFile()) {
    //        questionFunction(currentFile);
    //    }
    //}

    fs.readdir(currentPath, function (err, files) {
        files = files.filter(function (text) {
            return !/([CEIFM]{1})-(\d{5}\w{2}\d{4})-(\d{4})-(\d{1,})/.test(text);
        });

        for (let i in files) {
            let currentFile = `${testFolder}/${files[i]}`;
            console.log(files[i]);

            questionFunction(currentFile);
            //let stats = fs.stat(currentFile);

            //if (stats.isFile()) {
            //    questionFunction(currentFile);
            //}
        }
    });
};


// APP STARTUP
scanCurrentDirectory(testFolder);