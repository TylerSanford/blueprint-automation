///////////////////////////////////////////////////////////////////
/////////////////// INCLUDES & ASSIGNMENT /////////////////////////
///////////////////////////////////////////////////////////////////
const fs = require('fs');
const rl = require('readline-sync');
const hummusRecipe = require('hummus-recipe');
const hummus = require('hummus');
const clipboardy = require('clipboardy');
const childProcess = require("child_process");
const figlet = require('figlet');
const chalk = require('chalk');
const clear = require('clear');

const currentWorkingFolder = (!/\w/.test(process.argv[2].slice(0,2))) ? process.argv[2].slice(2, process.argv[2].length) : process.argv[2];
const sapCode = currentWorkingFolder.split('_')[0].split('-')[1].substr(1);
const oldCodeMatch = currentWorkingFolder.match(/[E]{1}([a-zA-Z]{2})-{0,1}([\d]{3,4})/);
const oldCode = oldCodeMatch[1] + (oldCodeMatch[2].length > 3 ? "" : "0") + oldCodeMatch[2];
const log = console.log;

var previousType, previousYear, previousDescription;

const includeHeader = () => {
    clear();



};

///////////////////////////////////////////////////////////////////
/////////////////// DATABASE FUNCTIONS ////////////////////////////
///////////////////////////////////////////////////////////////////
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../FileChangesDB.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }

    console.log("Connected to the database!");
});

// Function to Add File Changes data into DB
const fileChangesSqlTracker = (fileNameOld, fileNameNew, fileExtension, fileType, fileSAPCode, fileOldCode, fileYear, fileDescription, eFolder_FK, callback) => {
    let fileChangesExist = 'SELECT * FROM fileChanges WHERE fileNameNew = ? AND eFolder_FK = ?';
    let fileChangesCreate = 'INSERT INTO fileChanges(date, time, fileNameOld, fileNameNew, fileExtension, fileType, fileSAPCode, fileOldCode, fileYear, fileDescription, eFolder_FK) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    let d = new Date();
    // let customDate = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
    let customDate = d.getFullYear() + "-" + ((d.getMonth() + 1) <= 9 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1)) + "-" + (d.getDate() <= 9 ? "0" + d.getDate() : d.getDate());
    let customTime = d.getHours() + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2);

    db.get(fileChangesExist, [fileNameNew, eFolder_FK], (err, row) => {
        if (err) log(err);

        if (row !== undefined) {
            callback(row.id);
        } else {
            db.run(fileChangesCreate, [customDate, customTime, fileNameOld, fileNameNew + "." + fileExtension, fileExtension, fileType, fileSAPCode, fileOldCode, fileYear, fileDescription, eFolder_FK], function (error) {
                if (error) log(error);

                // The only way to return the Id of the created sFolder
                db.get("SELECT last_insert_rowid() as id", (error, row) => {
                    if (error) callback("sqlite efolder SELECT last_insert_rowid() error: ", error);

                    // Send Id to callback.
                    callback(row.id);
                });
            });
        }
    });
};

// Function to check / add eFolder name to DB
const eFolderSqlCheck = (eFolder, sFolderId, callback) => {
    let eFolderExists = 'SELECT * FROM eFolders WHERE folderName = ?';
    let eFolderCreate = 'INSERT INTO eFolders(folderName, sFolder_FK) VALUES(?, ?)';

    db.get(eFolderExists, eFolder, (err, row) => {
        if (err) log(err);

        // If there is a row, return row ID == sFolderId.
        if (row !== undefined) {
            callback(row.id);
        } else {
            db.run(eFolderCreate, [eFolder, sFolderId], (error) => {
                if (error) log(error);
                // The only way to return the Id of the created sFolder
                db.get("SELECT last_insert_rowid() as id", (error, row) => {
                    if (error) callback("sqlite efolder SELECT last_insert_rowid() error: ", error);

                    // Send Id to callback.
                    callback(row.id);
                });
            });
        }
    });
};

// Function to check / add sFolder name to DB
const sFolderSqlCheck = (sFolder, callback) => {
    let sFolderExists = 'SELECT * FROM sFolders WHERE folderName = ?';
    let sFolderCreate = 'INSERT INTO sFolders(folderName) VALUES(?)';

    // Check if database has S Folder name in sFolder table.
    db.get(sFolderExists, sFolder, (error, row) => {
        if (error) {
            callback("sqlite sfolder SELECT error: ", error);
        }

        // If there is a row, return row ID == sFolderId.
        if (row !== undefined) {
            // Send Id to callback.
            callback(row.id);
        } else {
            // Else insert sFolder name as folderName into sFolder table.
            db.run(sFolderCreate, sFolder, (error) => {
                if (error) {
                    callback("sqlite sfolder INSERT error: ", error);
                }

                // The only way to return the Id of the created sFolder
                db.get("SELECT last_insert_rowid() as id", (error, row) => {
                    if (error) callback("sqlite sfolder SELECT last_insert_rowid() error: ", error);

                    // Send Id to callback.
                    callback(row.id);
                });
            });
        }
    });
};

const queryStats = () => {
    includeHeader();
    let now = new Date();
    let weekAgo = new Date(new Date().setDate(now.getDate() - 7));
    let monthAgo = new Date(new Date().setDate(now.getDate() - 30));

    let dateFormat = (context) => {
        // return (context.getMonth() + 1) + "/" + context.getDate() + "/" + context.getFullYear();
	return context.getFullYear() + "-" + ((context.getMonth() + 1) <= 9 ? "0" + (context.getMonth() + 1) : (context.getMonth() + 1)) + "-" + (context.getDate() <= 9 ? "0" + context.getDate() : context.getDate());
    };

    let dateNowFormatted = dateFormat(now);
    let dateWeekAgoFormatted = dateFormat(weekAgo);
    let dateMonthAgoFormatted = dateFormat(monthAgo);

    let dayStatQuery = "SELECT COUNT(*) AS count FROM fileChanges WHERE date = ?";
    let weekMonthStatQuery = "SELECT COUNT(*) AS count FROM fileChanges WHERE date BETWEEN ? AND ?";
    let totalStatQuery = "SELECT COUNT(*) AS count FROM fileChanges";

    log(chalk.blue("STATS MENU"));
    log("1. Day");
    log("2. Week");
    log("3. Month");
    log("4. All");
    log("5. Return to Main menu");

    switch (rl.question("Please Select a stat option.. ")) {
        case "1":
            db.all(dayStatQuery, [dateNowFormatted], (err, row) => {
                if (err) log(err);

                log(chalk.green("Daily count for " + dateNowFormatted + ": " + row[0].count));
                rl.question("Press any key to continue: ");
                queryStats();
            });
            break;
        case "2":
            db.all(weekMonthStatQuery, [dateWeekAgoFormatted, dateNowFormatted], (err, row) => {
                if (err) log(err);

                log(chalk.green("Weekly count between " + dateWeekAgoFormatted + " and " + dateNowFormatted + ": " + row[0].count));
                rl.question("Press any key to continue: ");
                queryStats();
            });

            break;
        case "3":
            db.all(weekMonthStatQuery, [dateMonthAgoFormatted, dateNowFormatted], (err, row) => {
                if (err) log(err);

                log(chalk.green("Monthly count between " + dateMonthAgoFormatted + " and " + dateNowFormatted + ": " + row[0].count));
                rl.question("Press any key to continue: ");
                queryStats();
            });

            break;
        case "4":
            db.all(totalStatQuery, (err, row) => {
                if (err) log(err);

                log(chalk.green("Total files manipulated and logged: " + row[0].count));
                rl.question("Press any key to continue: ");
                queryStats();
            });

            break;
        case "5":
            questionAndValidate(5);
    }
};


///////////////////////////////////////////////////////////////////
//////////////////// CLEANUP FUNCTION /////////////////////////////
///////////////////////////////////////////////////////////////////
const deleteCompletedFiles = (directory) => {
    fs.readdir(directory, (err, files) => {
        if (err) log(err);

        let deleteList = files
            .filter((text) => {
                return /(COMPLETED-)/.test(text);
            })
            .concat(files.filter((text) => {
                return /(\.bak)/.test(text);
            }))
	    .concat(files.filter((text) => {
	         return /(\.log)/.test(text);
	    }))
	    .concat(files.filter((text) => {
		return /(\.dwl)/.test(text);
	    }))
	    .concat(files.filter((text) => {
		return /(\.dwl2)/.test(text);
	    }))
	    .concat(files.filter((text) => {
		return /(ndx\.xls)/.test(text.toLowerCase());
	    })).concat(files.filter((text) => {
		return /(\.dmp)/.test(text.toLowerCase());
	    })).concat(files.filter((text) => {
		return /(thumbs\.db)/.test(text.toLowerCase());
	    }));


	if (deleteList.length > 0) {
	    log(chalk.green("The Following Files Will be deleted: "));
	    
	    for (let i in deleteList) {
	        log(chalk.green(deleteList[i]));
	    }

	    if (rl.question("Type 'del' to delete: ").toLowerCase() === "del") {
	        for (let i in deleteList) {
                    fs.unlink(`${currentWorkingFolder}/${deleteList[i]}`, (err) => {
                        if (err) log(err);
                    });

                    log(chalk.bgWhite.red(deleteList[i] + " deleted!"));
                }
	    } else {
                questionAndValidate(5);
            }
        };
    });

    // questionAndValidate(5);
};


///////////////////////////////////////////////////////////////////
////////////////// FILE COUNTER FUNCTION //////////////////////////
///////////////////////////////////////////////////////////////////
const getRenamedFileCount = (type, year) => {
    const reg = new RegExp(`[${type}]{1}-\\d{5}\\w{2}\\d{4}-${year}-\\d{1,}`);
    const files = fs.readdirSync(currentWorkingFolder).filter(text => {
        return reg.test(text);
    });

    if (files.length > 0) {
        return files.length + 1;
    } else {
        return 1;
    }
};


///////////////////////////////////////////////////////////////////
///////////////// PDF MANIPULATION FUNCTION ///////////////////////
///////////////////////////////////////////////////////////////////
const modifyPdf = (fileName, newLabelName, newFileName) => {
    let inputFileName = `${currentWorkingFolder}/COMPLETED-${fileName}`;
    let outputFileName = `./${currentWorkingFolder}/${newFileName}.pdf`;

    const resizeWriter = hummus.createWriter(outputFileName);
    const resizeReader = hummus.createReader(inputFileName);
    const resize_page_count = resizeReader.getPagesCount();

    for (let i = 0; i < resize_page_count; i++) {
        const currentHeight = resizeReader.parsePage(i).getMediaBox()[3];
        const currentWidth = resizeReader.parsePage(i).getMediaBox()[2];

        const page = resizeWriter.createPage(0, 0, currentWidth, currentHeight);
        const pageContent = resizeWriter.startPageContentContext(page);

        pageContent
            .q()
            .drawImage(0, 0, inputFileName, {
                index: i,
                transformation: {
                    width: currentWidth,
                    height: i === 0 ? currentHeight - 25 : currentHeight,
                    proportional: true
                }
            })
            .Q();

        resizeWriter.writePage(page);
    }
    resizeWriter.end();

    let pdfDoc = new hummusRecipe(outputFileName, outputFileName);
    pdfDoc
        .editPage(1)
        .text(`FILE: ${newLabelName}`, 5, 8, {
            bold: true,
            font: "Courier New",
            fontSize: 12,
            color: "000000"
        })
        .endPage()
        .endPDF();

    log(chalk.green(`Success: Rename "${fileName}" => "${newFileName}.pdf"`));
    log(chalk.green(`Success: Label "${newLabelName}" inserted into "${newFileName}.pdf"`));
};


///////////////////////////////////////////////////////////////////
////////////// SEED POWERSHELL PROCESS FUNCTION ///////////////////
///////////////////////////////////////////////////////////////////
const seedPowershellProcess = (fileName) => {
    let spawn = childProcess.spawn, child;

    child = spawn("powershell.exe", [`start "${fileName}"`]);
};


/////////////////////////////////////////////////////////////////////
/////////////////// QUESTION VALIDATION FUNCTION ////////////////////
/////////////////////////////////////////////////////////////////////
const questionAndValidate = (q, callback) => {
    switch (q) {
        case 1:
            let type = rl.question("What file TYPE (C, E, I, M, F)? ").toUpperCase();

            if (/([CIFEM]{1})/.test(type) && type.length === 1) {
                log(chalk.blue(`Type: ${type}`));

                callback(type);
            } else {
                questionAndValidate(1, callback);
            }
            break;
        case 2:
            let year = rl.question("What is the file YEAR? ");
            let newYear = 0;

            if (year.length === 1 && year.toString() === "0") {
                // If passes checks, return the entered year.
                log(chalk.blue(`Year: 0000`));
                callback("0000");
            } else if (year.length === 2 && /[0-9]{2}/.test(year)) {
                // Out of the 6000 files I've manually completed, I have never came accross anything earlier than 1938. 
                // With that said, 1919 is safe.With the fallback of typing in a 4 digit year to be precise!
                // If year 2 digit year is before current year, make 20xx
                if (year <= new Date().getFullYear().toString().slice(2)) newYear = "20" + year;

                // If the 2 digit year is after the current year, make 19xx
                if (year > new Date().getFullYear().toString().slice(2)) newYear = "19" + year;

                // Return the modified entered year.
                log(chalk.blue(`Year: ${newYear}`));

                callback(newYear);
            } else if (year.length === 4 && /[0-9]{4}/.test(year)) {

                // If year is before 1900, or after the current year, reask.
                if (year.toString() !== "0000" && year < 1900 || year > new Date().getFullYear()) questionAndValidate(2, callback);

                // If passes checks, return the entered year.
                log(chalk.blue(`Year: ${year}`));

                callback(year);
            } else {
                // If anything else, reask.
                questionAndValidate(2, callback);
            }
            break;
        case 3:
            let description = rl.question("What is the file DESCRIPTION? ");
            
            if (description.length >= 5) {
		log(chalk.blue(`Description: ${description}`));
                log(chalk.yellow("------------------------------"));
		
	        callback(description.replace(/^\w/, function (chr) {
                    return chr.toUpperCase();
                }));
	    } else {
		questionAndValidate(3, callback);
	    }

            break;
        case 4:
            childProcess.execSync('taskkill /IM acrobat.exe /F');

            rl.question("Hit Enter: ");
            
            break;
        case 5:
            includeHeader();
console.log("SAP = ", sapCode);
console.log("Old Code = ", oldCode);
            log(chalk.blue("MAIN MENU"));
            log("1. Run  Automation");
            log("2. Cleanup Files");
            log("3. Stats");
            log("4. Quit");
            let runOrClean = rl.question("Choose an Option.. ");

            if (runOrClean.toLowerCase().trim() === "r" || runOrClean.toLowerCase().trim() === "run" || runOrClean === "1") {
                readDirectory(currentWorkingFolder);
            } else if (runOrClean.toLowerCase().trim() === "c" || runOrClean.toLowerCase().trim() === "clean" || runOrClean === "2") {
                deleteCompletedFiles(currentWorkingFolder);
            } else if (runOrClean.toLowerCase().trim() === "s" || runOrClean.toLowerCase().trim() === "stats" || runOrClean === "3") {
                queryStats();
            } else if (runOrClean === "4") {
                process.exit();
            } else {
                questionAndValidate(5, callback);
            }
            break;
        case 6:
            log(chalk.red(`WARNING: Don't answer yes until you have inserted the label, saved, and closed the dwg file.`));

            let finishedWithDwg = rl.question("Are you done with the drawing? (y or n) ");

            if (finishedWithDwg === "y") {
                callback(finishedWithDwg);
            } else {
                questionAndValidate(6, callback);
            }

	    break;
	case 7:
	    childProcess.execSync('taskkill /IM EXCEL.EXE /F');

	    rl.question("Hit Enter: ");
            
            break;
	case 8:
	    childProcess.execSync('taskkill /IM WINWORD.EXE /F');

	    rl.question("Hit Enter: ");
            
            break;
    }
};


///////////////////////////////////////////////////////////////////
//////////////// INITIALIZE & READ FUNCTIONS //////////////////////
///////////////////////////////////////////////////////////////////
const initializeFunction = (fileName, lastFile, nextFile) => {
    let fullPathSplit = __dirname.split('\\');
    let type, year, description, hitEnter;
    let fileType = fileName.split('.')[1].toString().toLowerCase();
    log("Working file name = ", chalk.green(fileName));
    log(chalk.yellow("------------------------------"));
    let sFolder = fullPathSplit[fullPathSplit.length - 1];

    let currFile = fileName.split('.')[0];
    nextFile = (nextFile !== undefined ? nextFile.split('.')[0] : "");
    lastFile = (lastFile !== undefined ? lastFile.split('.')[0] : "");

    if (nextFile !== undefined && currFile == nextFile) {
        // Launch file using powershell child process
        seedPowershellProcess(`${currentWorkingFolder}/${fileName}`);

        questionAndValidate(1, function (info) {
            type = info;
	    previousType = info;
        });
    
        questionAndValidate(2, function (info) {
            year = info;
	    previousYear = info;
        });

        questionAndValidate(3, function (info) {
            description = info;
	    previousDescription = info;
        });

    } else if (lastFile !== undefined && currFile == lastFile) {
	type = previousType;
	previousType = "";
	
	year = previousYear;
	previousYear = "";

	description = previousDescription;
	previousDescription = "";

    } else {
	// Launch file using powershell child process
        seedPowershellProcess(`${currentWorkingFolder}/${fileName}`);

        questionAndValidate(1, function (info) {
            type = info;
        });
    
        questionAndValidate(2, function (info) {
            year = info;
        });

        questionAndValidate(3, function (info) {
            description = info;
        });
    }

    let newLabelName = `${type}-${sapCode}${oldCode}-${year}-${getRenamedFileCount(type, year)}`;
    let newFileName = `${type}-${sapCode}${oldCode}-${year}-${getRenamedFileCount(type, year)} ${description}`;

    switch (fileType) {
        case "pdf":
	    if (lastFile !== "" && currFile == lastFile) {
		console.log(chalk.magenta("Drawing Data Copied to PDF!"));
	    } else {
		questionAndValidate(4, function (info) {
                    hitEnter = info;
                });
	    }
		
            try {
                fs.renameSync(`${currentWorkingFolder}/${fileName}`, `${currentWorkingFolder}/COMPLETED-${fileName}`);

                modifyPdf(fileName, newLabelName, newFileName);

                sFolderSqlCheck(sFolder, function (sFolderIdOrErr) {
                    if (typeof sFolderIdOrErr !== "number") return log(sFolderIdOrErr);

                    eFolderSqlCheck(currentWorkingFolder, sFolderIdOrErr, function (eFolderIdOrErr) {
                        if (typeof eFolderIdOrErr !== "number") return log(eFolderIdOrErr);

                        fileChangesSqlTracker(fileName, newFileName, fileType, type, sapCode, oldCode, year, description, eFolderIdOrErr, function (data) {
                            log(chalk.green("Success: Insert record into Database!"));
                        });
                    });
                });
            } catch (e) {
                if (e) console.log(e);
            }

            break;
        case "dwg":
	    let pasteItem = "FILE: " + newLabelName;
            clipboardy.writeSync(pasteItem);

            log(chalk.green(`Success: Copied "${newLabelName}" to the clipboard!`));

            questionAndValidate(6, function (info) {
                if (info === "y") {
                    try {
                        fs.renameSync(`${currentWorkingFolder}/${fileName}`, `${currentWorkingFolder}/${newFileName}.${fileType}`);

                        log(chalk.green(`Success: Rename "${fileName}" => "${newFileName}.${fileType}"`));

                        sFolderSqlCheck(sFolder, function (sFolderIdOrErr) {
                            if (typeof sFolderIdOrErr !== "number") return log(sFolderIdOrErr);

                            eFolderSqlCheck(currentWorkingFolder, sFolderIdOrErr, function (eFolderIdOrErr) {
                                if (typeof eFolderIdOrErr !== "number") return log(eFolderIdOrErr);

                                fileChangesSqlTracker(fileName, newFileName, fileType, type, sapCode, oldCode, year, description, eFolderIdOrErr, function (data) {
                                    log(chalk.green("Success: Insert record into Database!"));
                                });
                            });
                        });
                    } catch (e) {
                        if (e) console.log(e);
                    }
                }
            });

            break;
        case "xls":
	    questionAndValidate(7, function (info) {
                hitEnter = info;
            });

            try {
                fs.renameSync(`${currentWorkingFolder}/${fileName}`, `${currentWorkingFolder}/${newFileName}.${fileType}`);

                sFolderSqlCheck(sFolder, function (sFolderIdOrErr) {
                    if (typeof sFolderIdOrErr !== "number") return log(sFolderIdOrErr);

                    eFolderSqlCheck(currentWorkingFolder, sFolderIdOrErr, function (eFolderIdOrErr) {
                        if (typeof eFolderIdOrErr !== "number") return log(eFolderIdOrErr);

                        fileChangesSqlTracker(fileName, newFileName, fileType, type, sapCode, oldCode, year, description, eFolderIdOrErr, function (data) {
                            log(chalk.green("Success: Insert record into Database!"));
                        });
                    });
                });
            } catch (e) {
                if (e) console.log(e);
            }

	    break;
	case "doc":
	    questionAndValidate(8, function (info) {
                hitEnter = info;
            });

            try {
                fs.renameSync(`${currentWorkingFolder}/${fileName}`, `${currentWorkingFolder}/${newFileName}.${fileType}`);

                sFolderSqlCheck(sFolder, function (sFolderIdOrErr) {
                    if (typeof sFolderIdOrErr !== "number") return log(sFolderIdOrErr);

                    eFolderSqlCheck(currentWorkingFolder, sFolderIdOrErr, function (eFolderIdOrErr) {
                        if (typeof eFolderIdOrErr !== "number") return log(eFolderIdOrErr);

                        fileChangesSqlTracker(fileName, newFileName, fileType, type, sapCode, oldCode, year, description, eFolderIdOrErr, function (data) {
                            log(chalk.green("Success: Insert record into Database!"));
                        });
                    });
                });
            } catch (e) {
                if (e) console.log(e);
            }

	    break;
	case "docx":
	    questionAndValidate(8, function (info) {
                hitEnter = info;
            });

            try {
                fs.renameSync(`${currentWorkingFolder}/${fileName}`, `${currentWorkingFolder}/${newFileName}.${fileType}`);

                sFolderSqlCheck(sFolder, function (sFolderIdOrErr) {
                    if (typeof sFolderIdOrErr !== "number") return log(sFolderIdOrErr);

                    eFolderSqlCheck(currentWorkingFolder, sFolderIdOrErr, function (eFolderIdOrErr) {
                        if (typeof eFolderIdOrErr !== "number") return log(eFolderIdOrErr);

                        fileChangesSqlTracker(fileName, newFileName, fileType, type, sapCode, oldCode, year, description, eFolderIdOrErr, function (data) {
                            log(chalk.green("Success: Insert record into Database!"));
                        });
                    });
                });
            } catch (e) {
                if (e) console.log(e);
            }

    }
};

const readDirectory = (path) => {
    files = fs.readdirSync(path);
    files = files.filter((text) => {
        return !/([CEIFM]{1})-(\d{5}\w{2}\d{4})-(\d{4})-(\d{1,})/.test(text);
    });

        files = files.filter((text) => {
            return !/(COMPLETED-)/.test(text);
        });

	files = files.filter((text) => {
            return !/(\.bak)/.test(text);
        });
	
	files = files.filter((text) => {
            return !/(\.log)/.test(text);
        });

	files = files.filter((text) => {
            return !fs.lstatSync(`${currentWorkingFolder}/${text}`).isDirectory()
        });

	files = files.filter((text) => {
            return !/(\.dwl)/.test(text);
        });

	files = files.filter((text) => {
	    return !/(\.dwl2)/.test(text);
        });

	files = files.filter((text) => {
	    return !/(\.zip)/.test(text);
        });

	files = files.filter((text) => {
	    return !/(ndx\.xls)/.test(text.toLowerCase());
        });

	files = files.filter((text) => {
	    return !/(\.db)/.test(text.toLowerCase());
        });

	files = files.filter((text) => {
	    return !/(\.ini)/.test(text.toLowerCase());
        });

	files = files.filter((text) => {
	    return !/(\.dmp)/.test(text.toLowerCase());
        });

    console.log(chalk.cyan("Total Files = ", files.length));
    console.log(chalk.cyan("Total Runs Required = ", Math.ceil(files.length / 20)));

    // files.forEach((file) => {
    //    if (!fs.lstatSync(`${currentWorkingFolder}/${file}`).isDirectory()) {
    //        log(chalk.red("##############################################################"));
    //        log(chalk.red("##############################################################"));
    //        console.log(file);
    //        initializeFunction(file);
    //    }
    // });
    
    for (let i = 0; i < (files.length < 20 ? files.length : 20); i++) {
        log(chalk.red("##############################################################"));
	log(chalk.red("##############################################################"));
	log(chalk.yellow("Number: " + (i + 1)));
        log(chalk.red("##############################################################"));
        console.log(files[i]);

	let lastFile = (i === 0 ? "" : files[i-1]);
	let nextFile = (i === files.length ? "" : files[i+1]);
	
	console.log("lastFile: " + lastFile);
	console.log("nextFile: " + nextFile);
	
        initializeFunction(files[i], lastFile, nextFile);
    }	
};

//Start app with run or clean question.
questionAndValidate(5);