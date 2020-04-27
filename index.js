const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolver');
const conectarDB = require('./config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env' });

//Conectado con la DB
conectarDB();

// Servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({req}) => {
    //console.log(req.headers['autorization'])
    const token = req.headers['authorization'] || '';
    if(token){
      try{
        const usuario = jwt.verify(token, process.env.SECRETA)
        console.log(usuario);
        return {
          usuario
        }
      } catch (error){
        console.log(error);
      }
    }
  }
});


//Arrancando servidor
server.listen().then( ({url}) => {
    console.log(`Servidor listo en URL ${url}`);
})