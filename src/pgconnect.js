// // require('dotenv').config()
// const { Client } = require('pg')

// module.exports = async function () {

//   console.log("host: ", process.env.DB_HOST);

//   const client = new Client({
//     user: process.env.DB_USER,
//     host: process.env.DB_HOST,
//     password: process.env.DB_PASSWORD,
//     port: 5432,
//   })
//   client.connect()
//   // promise
//   await client
//     // .query('SELECT NOW()')
//     .query('SELECT * FROM ORGANIZATION')
//     .then(res => {
//       console.log("-------");
//       console.log(JSON.stringify(res.rows[0]))
//     }
//     )
//   await client.end();

// }


// // module.exports()