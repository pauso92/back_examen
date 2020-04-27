
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
require('dotenv').config({ path: 'variables.env' });


const crearToken = (usuario, secreta, expiresIn) => {
    console.log(usuario);
    const { id, email, nombre, apellido } = usuario;


    return jwt.sign({ id }, secreta, { expiresIn })
}

//Resolvers
const resolvers = {
    Query: {
        obtenerUsuario: async (_, { token }) => {
            const usuarioID = await jwt.verify(token, process.env.SECRETA)

            return usuarioID;
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({});
                return productos;
            } catch (error) {
                console.log(error)
            }
        },
        obtenerProducto: async (_, { id }) => {
            //Validando si existe prodicto
            const producto = await Producto.findById(id);
            if (!producto) {
                throw new Error('Producto no encontrado')
            }
            return producto
        },
        obtenerClientes: async () => {
            try {
                const clientes = await Cliente.find({});
                return clientes;
            } catch (error) {
                console.logn(error);
            }
        },
        obtenerClientesVendedor: async (_, { }, ctx) => {
            try {
                const clientes = await Cliente.find({ vendedor: ctx.usuario.id.toString() });
                return clientes;
            } catch (error) {
                console.logn(error);
            }
        },
        obtenerCliente: async (_, { id }, ctx) => {
            //Revisar si el cliente existe
            const cliente = await Cliente.findById(id);

            if (!cliente) {
                throw new Error('Cliente no encontrado');
            }
            //Quien lo creo
            if (cliente.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciades')
            }
            return cliente;
        },
        obtenerPedidos: async () => {
            try{
                const pedidos = await Pedido.find({});
                return pedidos;
            } catch (error){

            }
        },
        obtenerPedidosVendedor: async (_, {}, ctx) => {
            try {
                const pedidos = await Pedido.find({ vendedor: ctx.usuario.id });
                return pedidos;
            } catch(error){
                console.log(error);
            }
        },
        obtenerPedido: async(_, {id}, ctx) =>{
            // Verificamos si existe pedido
            const pedido = await Pedido.findById(id);
            if(!pedido){
                throw new Error('Pedido no encontrado');
            }

            //Quien lo creo puede verlo
            if(pedido.vendedor.toString() !== ctx.usuario.id){
                throw new Error ('Accion no permitida');
            }

            //retornar el resultado
            return pedido;
        },
        obtenerPedidosEstado: async (_, { estado }, ctx) => {
            const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });
            return pedidos;
        }
    },
    Mutation: {
        nuevoUsiario: async (_, { input }) => {
            const { email, password } = input;

            //Revisar si existe usuario
            const existeUsuario = await Usuario.findOne({ email });
            console.log(existeUsuario);
            if (existeUsuario) {
                throw new Error('El usuario ya esta registrado')
            }

            // Hashear password
            const salt = await bcryptjs.genSalt(10);
            input.password = await bcryptjs.hash(password, salt);


            //Guardar en la DB
            try {
                const usuario = new Usuario(input);
                usuario.save();
                return usuario;
            } catch (error) {
                console.log(error)
            }
        },
        autenticarUsuario: async (_, { input }) => {
            const { email, password } = input;

            //Existe el usuario dado de alta
            const existeUsuario = await Usuario.findOne({ email });
            if (!existeUsuario) {
                throw new Error('El usuario no existe')
            }

            // Revisar el password de usurio login
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            if (!passwordCorrecto) {
                throw new Error('El password no es correcto');
            }

            // Creando Token

            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '24h')
            }
        },
        nuevoProducto: async (_, { input }) => {
            try {
                const producto = new Producto(input);

                //Ingresando producto a la DB
                const resultado = await producto.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarProducto: async (_, { id, input }) => {
            //Revisamos si existe producto
            let producto = await Producto.findById(id);
            if (!producto) {
                throw new Error('Producto no encontrado')
            }
            //Guardamos en la DB.
            producto = await Producto.findOneAndUpdate({ _id: id }, input, { new: true });
            return producto
        },
        eliminarProducto: async (_, { id }) => {
            //Revisamos si existe producto
            let producto = await Producto.findById(id);
            if (!producto) {
                throw new Error('Producto no encontrado')
            }
            //eliminando prodicto
            await Producto.findOneAndDelete({ _id: id });
            return "Producto Eliminado..."
        },
        nuevoCliente: async (_, { input }, ctx) => {
            console.log(ctx);
            //Verificar si el cliente existe
            const { email } = input

            const cliente = await Cliente.findOne({ email });
            if (cliente) {
                throw new Error('El cliente ya éxiste');
            }
            const nuevoCliente = new Cliente(input);

            //Asignar vendedor
            nuevoCliente.vendedor = ctx.usuario.id;

            //Guardar en DB
            try {
                const resultado = await nuevoCliente.save();
                return resultado;
            } catch (error) {
                console.log(error)
            }
        },
        actualizarCliente: async (_, { id, input }, ctx) => {
            //Verificamos si existe
            let cliente = await Cliente.findById(id);
            if (!cliente) {
                throw new Error('El cliente no existe');
            }
            //Verificamos si el vendedor es quien edita
            if (cliente.vendedor.toString() != ctx.usuario.id) {
                throw new Error('No Puedes modificar este usuariio');
            }

            //Guardar cambios cliente
            cliente = await Cliente.findOneAndUpdate({ _id: id }, input, { new: true });
            return cliente;
        },
        eliminarCliente: async (_, { id }, ctx) => {
            //Verificamos que usuario exista
            let cliente = await Cliente.findById(id);
            if (!cliente) {
                throw new Error('Este cliente no existe');
            }
            //Confirmamos que el vendor es quien elimina
            if (cliente.vendedor.toString() != ctx.usuario.id) {
                throw new Error('No se puede eliminar este usuario no tienes las credenciales');
            }
            //Eliminar cliente DB
            await Cliente.findOneAndDelete({ _id: id });
            return "Cliente eliminado...";
        },
        nuevoPedido: async (_, {input}, ctx) => {
            console.log("Aqui esta input",input);
            const { cliente } = input
            //Verificar si el ciente existe
            let clienteExiste = await Cliente.findById(cliente);

            if (!clienteExiste) {
                throw new Error('Este cliente no existe');
            }

            //Verificar si el cliente es del vendedor
            if (clienteExiste.vendedor.toString() != ctx.usuario.id) {
                throw new Error('No tienes las credenciales para esta operación');
            }

            //Verificar que el stok este disponible
            for await (const articulo of input.pedido ) {
                const { id } = articulo;
                const producto = await Producto.findById(id);

                if (articulo.cantidad > producto.existencia) {
                    throw new Error(`El articulo: ${producto.nombre} no cuenta con suficiencia en stock`);
                } else {
                    producto.existencia = producto.existencia - articulo.cantidad;
                    await producto.save();
                }
            }
            console.log('Despues del error');

            //Crear pedido
            const nuevoPedido = new Pedido(input);

            //Asignar vendedor
            nuevoPedido.vendedor = ctx.usuario.id;

            //Registrar pedido en DB
            const resultado = await nuevoPedido.save();
            return resultado
        },
        actualizarPedido: async (_, {id, input}, ctx) =>{
            const { cliente } = input
            //El pedido existe
            const existePedido = await Pedido.findById(id);
            if(!existePedido){
                throw new Error('El pedido no existe');
            }

            //Ciente existe
            const existeCliente = await Cliente.findById(cliente);
            if(!existeCliente){
                throw new Error('El cliente no existe');
            }

            //Ciente y pedido pertenecen a vendedor
            if(existeCliente.vendedor.toString() !== ctx.usuario.id){
                throw new Error('No tiene las credenciales')
            }

            //Validar Stock 
            if( input.pedido ) {
                for await (const articulo of input.pedido ) {
                    const { id } = articulo;
                    const producto = await Producto.findById(id);
    
                    if (articulo.cantidad > producto.existencia) {
                        throw new Error(`El articulo: ${producto.nombre} no cuenta con suficiencia en stock`);
                    } else {
                        producto.existencia = producto.existencia - articulo.cantidad;
                        await producto.save();
                    }
                }
            }

            //Gardar Pedido
            const resultado = await Pedido.findOneAndUpdate({_id: id}, input, {new:true});
            return resultado;
        },
        eliminarPedido: async (_, {id}, ctx) => {
            //Validar si existe pedido
            const pedido = await Pedido.findById(id);
            if(!pedido) {
                throw new Error ('El pedido no existe');
            }

            //Verificar que sea su vendedor al borra
            if(pedido.vendedor.toString() !== ctx.usuario.id) {
                throw new Error('No tienes las credenciales para esta operación');
            }

            //Eliminar de la DB
            await Pedido.findOneAndDelete({_id: id});
            return "Pedido eliminado..."
        }
    }
}

module.exports = resolvers;