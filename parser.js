import fetch from "node-fetch"
import {parse} from 'node-html-parser';
import iconvLite from "iconv-lite";
import sqlite3 from 'sqlite3';

const connectToDB = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('', (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(db)
        });
    });
}


const insertIntoDB = (db, news) => {
    return new Promise((resolve, reject) => {
        db.run("CREATE TABLE IF NOT EXISTS news(id INTEGER PRIMARY KEY, date Date, title TEXT)", (err) => {
            if (err) {
                reject(err);
                return;
            }
            // const date = new Date().toISOString();
            for (const newsItem of news) {
                const sql = `INSERT INTO news (date, title) VALUES (?, ?)`
                db.run(sql, [newsItem.date, newsItem.title]);
            }
            resolve()
        });
    })
}

const readRows = (db) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM news ORDER BY date DESC", (err, rows) => {
            if (err) {
                reject(err);
                return
            }
            resolve(rows);
        });
    });
}

const getNews = async () => {
    const response = await fetch("https://www.roscosmos.ru/102/");
    const htmlBuffer = await response.buffer();
    const html = iconvLite.decode(htmlBuffer, "windows-1251");
    const parsedHtml = parse(html);

    return [...parsedHtml.querySelectorAll(".newslist")].map((node) => {
        return {
            date: new Date(node.querySelector(".date").childNodes[0]._rawText.split(".").reverse().join("-")).toISOString(),
            title: node.querySelector(".name").childNodes[0]._rawText,
        }
    });
}

const readNewsFromDB = async (db) => {
    if (!db) {
        db = await connectToDB();
    }

    const rows = await readRows(db);

    console.table(rows);

    return rows;
}

const getHtml = async () => {
    const news = await getNews();

    if (!news || !news.length) {
        console.log("empty news");
        return;
    }

    const db = await connectToDB();
    await insertIntoDB(db, news);

    await readNewsFromDB(db);

    db.close();
};


getHtml();
