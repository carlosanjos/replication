const mysql = require('mysql');
const faker = require('faker');

setInterval(() => {
    const conn = mysql.createConnection({
        host: "127.0.0.1",
        user: "abc",
        password: "123",
        database: 'playground',
        port: 3301
    });

    conn.connect((err) => {
        if (err) throw err;
        console.log("Connected!");

        const queryTable = 'SELECT * FROM device';

        conn.query(queryTable, (err, result) => {
            if (err) throw err;

            result.forEach(el => {
                const insertFake = `INSERT INTO beacon (device_id, lat, lon, battery_level) VALUES (${el.id}, ${faker.address.latitude()}, ${faker.address.longitude()}, ${faker.datatype.number(100)})`

                conn.query(insertFake, (err, result) => {
                    if (err) throw err;
                    console.log(`${result.affectedRows} rows affected`);
                    console.log(new Date().toISOString());
                });
            });

            conn.end((err) => {
                if (err) throw err;

                console.log('connection closed');
            });
        });
    });
}, 1000 * 15);
