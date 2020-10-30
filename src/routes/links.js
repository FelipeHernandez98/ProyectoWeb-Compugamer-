const express = require('express');
const router = express.Router();
const pool = require('../databases');
const { isLoggedIn } = require('../lib/protectLinks');
const helpers = require('../lib/helpers');
const LocalStorage = require('node-localstorage').LocalStorage,
    localStorage = new LocalStorage('./scratch');
require('../routes/authentication');
const uuid = require('uuid').v4;
const cloudinary = require('cloudinary').v2;
var xlsx = require('xlsx');
cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET,

});
const fs = require('fs-extra');

const formatterPeso = new Intl.NumberFormat('es-CO', {
     style: 'currency',
     currency: 'COP',
     minimumFractionDigits: 0
})



//obteniendo ruta para agregar nuevo pc
router.get('/add', isLoggedIn, (req, res) => {
     res.render('links/add');
});


//editando slogan principal
router.get('/edit_slogan', isLoggedIn, (req, res) => {
     res.render('links/edit_slogan');
});

router.post('/edit_slogan', isLoggedIn, async (req, res) => {

     let slog = req.body.slogan;
     const slogan = {
          descripcion: slog
     }
     let data = await pool.query('select * from slogan');
    

     if (Object.keys(data).length > 0) {
          await pool.query('UPDATE slogan SET descripcion = ? WHERE id = ?', [slog, 1]);

     } else {
          await pool.query('INSERT INTO slogan SET ?', [slogan]);
     }
     req.flash('success', 'Se actualizo el slogan principal correctamente');
     res.redirect('/profile');
});

//obteniendo ruta para agregar nuevo vendedor
router.get('/add_vendedor', isLoggedIn, (req, res) => {
     res.render('links/add_vendedor');
});

router.post('/add_vendedor', isLoggedIn, async (req, res) => {

     const { name } = req.body;
     const { secondname } = req.body;
     const { telefono } = req.body;
     const { cedula } = req.body;
     const newUser = {
          vend_nombre: name,
          vend_apell: secondname,
          vend_tel: telefono,
          vend_cedula: cedula
     }

     await pool.query('INSERT INTO vendedor SET ?', [newUser]);
     req.flash('success', 'El vendedor ' + name + ' se almaceno correctamente');
     res.redirect('/profile');
});

//agregando nuevo pc
router.post('/add', isLoggedIn, async (req, res) => {
     const { tipo } = req.body;
     const { marca, referencia, procesador, ram, almacenamiento, grafica, precio } = req.body;
     var result = {};
     try {
          result = await cloudinary.uploader.upload(req.file.path);
          await fs.unlink(req.file.path);//eliminando imagen del servidor
     } catch (error) {
          result.url = "";
          result.public_id = "";
     }

     const newPC = {
          comp_tipo: tipo,
          comp_marca: marca,
          comp_ref: referencia,
          comp_proc: procesador,
          comp_ram: ram,
          comp_alm: almacenamiento,
          comp_vid: grafica,
          image_url: result.url,
          public_id: result.public_id,
          precio: precio
     };
     await pool.query('INSERT INTO computador set ?', [newPC]);
     req.flash('success', 'Computador Agregado Correctamente');

     if (tipo == 1) {
          res.redirect('/links/desktop');
     } else if (tipo == 2) {
          res.redirect('/links/laptop');
     } else if (tipo == 3) {
          res.redirect('/links/allinone');
     }


});

//subiendo o actualizando foto de perfil del usuario
router.post('/upload/:id', isLoggedIn, async (req, res) => {
     const id = req.params.id;
     try {
          const row = await pool.query('SELECT public_id FROM cliente WHERE id = ?', [id]);
          await cloudinary.uploader.destroy(row[0].public_id);
     } catch (error) {

     }
     const result = await cloudinary.uploader.upload(req.file.path);
     const profile_img = result.url;
     const public_id = result.public_id;
     await pool.query('UPDATE cliente SET profile_img = ?, public_id = ? WHERE id = ?', [profile_img, public_id, id]);
     req.flash('success', 'Se actualizo su foto de perfil correctamente');
     await fs.unlink(req.file.path);//eliminando imagen del servidor

     res.redirect('/profile');
});

//obteniendo ruta escritotio
router.get('/desktop', isLoggedIn, async (req, res) => {

     const pc = await pool.query('SELECT * FROM computador WHERE comp_tipo = 1');
     for (let clave in pc) {
          // 
          if (pc.hasOwnProperty(clave)) {

               pc[clave].precio = formatterPeso.format(pc[clave].precio);

          }
     }

     res.render('links/list', { pc });

});
//obteniendo ruta portatiles
router.get('/laptop', isLoggedIn, async (req, res) => {
     const pc = await pool.query('SELECT * FROM computador WHERE comp_tipo = 2');

     for (let clave in pc) {
          // 
          if (pc.hasOwnProperty(clave)) {

               pc[clave].precio = formatterPeso.format(pc[clave].precio);

          }
     }

     res.render('links/list', { pc });

});

//obteniendo ruta todo en uno
router.get('/allinone', isLoggedIn, async (req, res) => {
     const pc = await pool.query('SELECT * FROM computador WHERE comp_tipo = 3');
     for (let clave in pc) {
          // 
          if (pc.hasOwnProperty(clave)) {

               pc[clave].precio = formatterPeso.format(pc[clave].precio);

          }
     }

     res.render('links/list', { pc });

});

//eliminando pc
router.get('/delete/:id', isLoggedIn, async (req, res) => {
     const { id } = req.params;
     const row = await pool.query('SELECT * FROM computador WHERE id = ?', [id]);
     try {
          await cloudinary.uploader.destroy(row[0].public_id);
     } catch (error) {

     }
     await pool.query('DELETE FROM computador WHERE id = ?', [id]);

     req.flash('success', 'Computador Eliminado Satisfactoriamente');
     if (row[0].comp_tipo == 1) {
          res.redirect('/links/desktop');
     } else if (row[0].comp_tipo == 2) {
          res.redirect('/links/laptop');
     } else if (row[0].comp_tipo == 3) {
          res.redirect('/links/allinone');
     }
});

//obteniendo ruta agregar existencias
router.get('/add_exist/:id', isLoggedIn, async (req, res) => {
     const { id } = req.params;
     const pc = await pool.query('SELECT * FROM computador WHERE id = ?', [id]);
     res.render('links/add_exist', { pc: pc[0] });
});


//agregando existencias
router.post('/add_exist/:id', isLoggedIn, async (req, res) => {
     const { id } = req.params;
     var existencias = Number(req.body.existencias);
     var row = await pool.query('SELECT * FROM computador WHERE id = ?', [id]);
     req.flash('success', existencias + ' Nuevos ' + row[0].comp_marca + ' ' + row[0].comp_ref + ' agregados correctamente');
     existencias = Number(row[0].existencias) + existencias;
     await pool.query('UPDATE computador set existencias = ? WHERE id = ?', [existencias, id]);

     if (row[0].comp_tipo == 1) {
          res.redirect('/links/desktop');
     } else if (row[0].comp_tipo == 2) {
          res.redirect('/links/laptop');
     } else if (row[0].comp_tipo == 3) {
          res.redirect('/links/allinone');
     }
});

//obteniendo ruta para editar los pc
router.get('/edit/:id', isLoggedIn, async (req, res) => {
     const { id } = req.params;
     const pc = await pool.query('SELECT * FROM computador WHERE id = ?', [id]);
     res.render('links/edit', { pc: pc[0] });
});

//editando los pc
router.post('/edit/:id', isLoggedIn, async (req, res) => {
     const { id } = req.params;
     const { tipo } = req.body;
     const { marca, referencia, procesador, ram, almacenamiento, grafica, precio } = req.body;
     var result = {};
     try {
          result = await cloudinary.uploader.upload(req.file.path);
          await fs.unlink(req.file.path);//eliminando imagen del servidor
          const row = await pool.query('SELECT * FROM computador WHERE id = ?', [id]);

          try {
               await cloudinary.uploader.destroy(row[0].public_id);
          } catch (error) {

          }
     } catch (error) {

          result.url = await pool.query('SELECT image_url FROM computador WHERE id = ?', [id]);
          result.public_id = await pool.query('SELECT public_id FROM computador WHERE id = ?', [id]);;;
          result.url = result.url[0].image_url;
          result.public_id = result.public_id[0].public_id
     }


     const actPC = {
          comp_tipo: tipo,
          comp_marca: marca,
          comp_ref: referencia,
          comp_proc: procesador,
          comp_ram: ram,
          comp_alm: almacenamiento,
          comp_vid: grafica,
          image_url: result.url,
          precio: precio,
          public_id: result.public_id
     };
     await pool.query('UPDATE computador set ? WHERE id = ?', [actPC, id]);
     req.flash('success', 'Computador Actualizado Correctamente');

     if (tipo == 1) {
          res.redirect('/links/desktop');
     } else if (tipo == 2) {
          res.redirect('/links/laptop');
     } else if (tipo == 3) {
          res.redirect('/links/allinone');
     }


});

//obteniendo ruta para editar datos del usuario
router.get('/edit_data/:id', isLoggedIn, async (req, res) => {
     const id = req.user.id;
     const myUser = await pool.query('SELECT * FROM cliente WHERE id = ?', [id]);
     res.render('links/edit_data', { myUser: myUser[0] });
});

//editando datos personales del usuario
router.post('/edit_data/:id', async (req, res) => {

     const { id } = req.params;

     console.log(req.body);
     var { username } = req.body;
     var { password } = req.body;
     const { name } = req.body;
     const { email } = req.body;
     const { secondname } = req.body;
     const { telefono } = req.body;
     const { direccion } = req.body;


     var actUser = {
          clie_nomb: name,
          clie_apell: secondname,
          clie_tel: telefono,
          clie_dir: direccion,
          username: username,
          password: password,
          email: email
     }

     if (password == "") {
          const row = await pool.query('SELECT password FROM cliente WHERE id = ?', [id]);
          actUser.password = row[0].password;

     } else {
          actUser.password = await helpers.encryptPassword(req.body.password);
     }

     await pool.query('UPDATE cliente SET ? WHERE id = ?', [actUser, id]);
     req.flash('success', 'Se actualizaron sus datos correctamente ' + actUser.username);
     res.redirect('/profile');
});

//obteniendo ruta para importar datos desde excel
router.get('/import_xlsx', (req, res) => {
     res.render('links/import_xlsx');
});

//importando los datos desde excel
router.post('/import_xlsx', async (req, res) => {

     var wb = xlsx.readFile(req.file.path, { cellDates: true });

     var pc = {
          comp_tipo: 0,
          comp_marca: '',
          comp_ref: '',
          comp_proc: '',
          comp_ram: '',
          comp_alm: '',
          comp_vid: '',
          image_url: '',
          public_id: '',
          existencias: '',
          precio: 0
     };
     var contador = 0;
     for (var i = 0; i < wb.SheetNames.length; i++) {
          var ws = wb.Sheets[wb.SheetNames[i]];
          var data = xlsx.utils.sheet_to_json(ws);
          if (Object.keys(data).length === 0) {
               //nada
          } else {
               for (var clave in data) {
                    // Controlando que json realmente tenga esa propiedad
                    if (data.hasOwnProperty(clave)) {

                         pc.comp_ref = data[clave].Ref
                         pc.comp_ram = data[clave].Ram
                         pc.comp_vid = data[clave].Video
                         pc.comp_alm = data[clave].Almacenamiento
                         pc.comp_proc = data[clave].Procesador
                         pc.comp_marca = data[clave].Marca
                         pc.existencias = data[clave].Existencias
                         pc.precio = data[clave].Precio
                         if (data[clave].Tipo.toLowerCase() == 'escritorio') {
                              pc.comp_tipo = 1;
                         }
                         if (data[clave].Tipo.toLowerCase() == 'portatil') {
                              pc.comp_tipo = 2;
                         }
                         if (data[clave].Tipo.toLowerCase() == 'todo en uno') {
                              pc.comp_tipo = 3;
                         }

                    }
                    var exist = await pool.query('SELECT * FROM computador WHERE comp_ref = ?', [pc.comp_ref]);



                    if (Object.keys(exist).length === 0) {
                         await pool.query('INSERT INTO computador set ?', [pc]);
                         contador++;
                    }
               }
          }
     }
     await fs.unlink(req.file.path);
     if (pc.comp_tipo === 0) {
          //significa que no hubo productos por eso el tipo no se modifico
          req.flash('message', 'El excel subido arrojo ' + (contador) + " Productos, no se realizaron cambios en la base de datos");
          res.redirect('/profile');
     } else {
          req.flash('success', 'El excel subido arrojo ' + (contador) + " Productos, los cuales se almacenaron correctamente en su base de datos");
          res.redirect('/profile');
     }
});
//obteniendo ruta para listar los pc

router.get('/registrar_venta', async (req, res) => {

     var carrito = '0';
     //recorriendo el storage para ver si hay computadores agregados para vender
     for (let x = 0; x < localStorage.length; x++) {
          carrito += (localStorage.key(x)) + ",";
     }
     //formateamos el string carrito quitando la ultima ','
     carrito = carrito.slice(0, -1);
     //si carrito esta vacio, ponemos el valor de cero para que la consulta no se totee
     if ((carrito == '')) {
          carrito = '0';
     }


     let pc = {};
     //seleccionando todos los pc que no esten en el carrito de ventas
     let query = 'SELECT * FROM computador WHERE id NOT IN (' + carrito + ')';

     pc = await pool.query(query);
     // poniendo el tipo de pc que es de acuerdo a su id
     for (let clave in pc) {
          // 
          if (pc.hasOwnProperty(clave)) {
               let tipo = await pool.query('SELECT tipo_desc FROM tipo_computador WHERE tipo_id = ?', [pc[clave].comp_tipo]);

               pc[clave].comp_tipo = tipo[0].tipo_desc;
               pc[clave].precio = formatterPeso.format(pc[clave].precio);



          }
     }

     //redireccionando para listar los pc encontrados
     res.render('links/registrar_venta', { pc });
});
//listando empleados
router.get('/list_of_employee', async (req, res) => {
     let employee = await pool.query('SELECT * FROM vendedor');
     res.render('links/list_of_employee', { employee });

});

//listando clientes
router.get('/clientes', async (req, res) => {
     let clientes = await pool.query('SELECT * FROM cliente WHERE clie_privilegiado = 0');
     res.render('links/clientes', { clientes });

});

router.get('/ingresos', async (req, res) => {
     let ingresos = await pool.query('SELECT * FROM ingresos');
    
     if (Object.keys(ingresos).length === 0) {

     }else{
     for (let clave in ingresos) {
          // 
          if (ingresos.hasOwnProperty(clave)) {
               ingresos[clave].cantidad_real = formatterPeso.format(ingresos[clave].cantidad);
          }
     }
}
     console.log(ingresos);
     res.render('links/ingresos', { ingresos });

});

router.get('/listar_facturas/:id', async (req, res) => {
     let id = req.params.id;
     console.log(id);

     var facturas = await pool.query('SELECT * FROM ingresos WHERE id_usuario = ?', [id]);
     console.log(facturas);
     if (Object.keys(facturas).length === 0) {
          req.flash('message', 'No hay facturas asociadas ');
          res.redirect('/links/clientes');

     }else{
     res.render('links/list_facturas', { facturas });
     }

});

router.get('/ver_facturas/:codigo_factura', async (req, res) => {
     let codigo = req.params.codigo_factura;
     var data = await pool.query('SELECT * FROM venta WHERE id_factura = ?', [codigo]);
     var user = await pool.query('SELECT * FROM cliente WHERE id = ?', [data[0].id_usuario]);
     var datos =
     {
          datos: [],
          datos_total: []
     };
     var ingresos_totales = 0;
     if (Object.keys(data).length === 0 && Object.keys(user).length === 0) {
          req.flash('message', 'No hay facturas asociadas ');
          res.redirect('/links/clientes');

     }else{
     for (let clave in data) {
          // 
          if (data.hasOwnProperty(clave)) {

               let pc = await pool.query('SELECT * FROM computador WHERE id = ? ', [data[clave].id_producto]);
               let vendedor = await pool.query('SELECT * FROM vendedor WHERE id = ? ', [data[clave].id_vendedor]);
               var factura = {
                    cliente: '',
                    producto: '',
                    factura: '',
                    fecha: '',
                    vendedor: '',
                    cantidad: 0,
                    ingresos: '',

               }; let temp = pc[0].precio * data[clave].cantidad;
               ingresos_totales += pc[0].precio * data[clave].cantidad;
               factura.cliente = user[0].clie_nomb + " " + user[0].clie_apell;
               factura.producto = pc[0].comp_marca + " " + pc[0].comp_ref;
               factura.factura = data[clave].id_factura;
               factura.vendedor = vendedor[0].vend_nombre + " " + vendedor[0].vend_apell;
               factura.fecha = data[clave].fecha_venta;
               factura.cantidad = data[clave].cantidad;
               factura.ingresos = formatterPeso.format(temp);

               datos.datos.push(factura);


          }
     }
     }
     let ingresos_to = formatterPeso.format(ingresos_totales);
     let ing = { ingresos_total: ingresos_to }
     datos.datos_total.push(ing);

     res.render('links/facturas', datos);

});

router.post('/delete_employee/:id', async (req, res) => {
     let id = req.params.id;
     await pool.query('DELETE FROM vendedor WHERE id = ?', [id]);
     req.flash('success', 'Empleado eliminado satisfactoriamente');
     res.redirect('/links/list_of_employee');
});

//añadiendo computadores al storage para la venta
router.get('/add_venta/:id', async (req, res) => {

     let id = req.params.id;
     let name = `${req.params.id}`;
     let pc1 = await pool.query('SELECT * FROM computador WHERE id = ?', [id]);
     localStorage.setItem(name, id);
     req.flash('success', 'Se añadio al carrito de ventas : ' + pc1[0].comp_marca + ' ' + pc1[0].comp_ref);
     res.redirect('/links/registrar_venta');

});
// limpiando el carrito de ventas
router.get('/limpiar_storage', (req, res) => {
     localStorage.clear();
     req.flash('message', 'Se limpio el carrito de ventas, la lista volvio a ser actualizada');
     res.redirect('/links/registrar_venta');
});

//observando productos del carrito
router.get('/shopping_car', async (req, res) => {
     var carrito = '0';
     //recorriendo el storage para ver si hay computadores agregados para listar
     for (let x = 0; x < localStorage.length; x++) {
          carrito += (localStorage.key(x)) + ",";
     }
     //formateamos el string carrito quitando la ultima ','
     carrito = carrito.slice(0, -1);
     //si carrito esta vacio, ponemos el valor de cero para que la consulta no se totee
     if ((carrito == '')) {
          carrito = '0';
     }

     let pc = {};
     //seleccionando todos los pc que esten en el carrito de ventas
     let query = 'SELECT * FROM computador WHERE id IN (' + carrito + ')';

     pc = await pool.query(query);
     // poniendo el tipo de pc que es de acuerdo a su id
     for (let clave in pc) {
          // 
          if (pc.hasOwnProperty(clave)) {
               let tipo = await pool.query('SELECT tipo_desc FROM tipo_computador WHERE tipo_id = ?', [pc[clave].comp_tipo]);

               pc[clave].comp_tipo = tipo[0].tipo_desc;
               pc[clave].precio = formatterPeso.format(pc[clave].precio);

          }
     }
     if (Object.keys(pc).length === 0) {
          req.flash('message', 'El carrito esta vacio');
          res.redirect('/links/registrar_venta');
     } else {
          res.render('links/shopping_car', { pc });
     }
});

//eliminando del carrito de compras
router.get('/delete_of_shopping/:id', async (req, res) => {

     const id = req.params.id;
     localStorage.removeItem(id);
     req.flash('success', 'Producto eliminado del carrito');
     res.redirect('/links/shopping_car');
});

router.get('/generate_sell', async (req, res) => {
     let cantidad = [];
     cantidad = req.query;

     for (let x = 0; x < localStorage.length; x++) {
          const id = localStorage.key(x);
          localStorage.setItem(id, cantidad[id]);

     }

     for (let x = 0; x < localStorage.length; x++) {
          const id = localStorage.key(x);
          let pc = await pool.query('SELECT * FROM computador WHERE id =?', [id]);
          if (pc[0].existencias < localStorage.getItem(localStorage.key(x))) {
               req.flash('message', 'No hay suficientes existencias para ' + pc[0].comp_marca + ' ' + pc[0].comp_ref + ' por favor revise cuidadosamente el numero de existencias disponibles');
               res.redirect('/links/shopping_car');
               return;
          }
     }


     let vendedor = await pool.query('SELECT * FROM vendedor');
     res.render('links/select_vendedor', { vendedor });
});

router.get('/review_generate_cell', async (req, res) => {
     let vendedor = await pool.query('SELECT * FROM vendedor');
     res.render('links/select_vendedor', { vendedor });

});

router.get('/interesting/:id', async (req, res) => {
     let id = req.params.id;
     let pc = await pool.query('SELECT * FROM computador WHERE id = ?', [id]);
     let user = await pool.query('SELECT * FROM cliente WHERE id = ?', [req.user.id]);
     let data = {
          datos_pc: [],
          datos_user: []
     };

     data.datos_pc = pc;
     data.datos_user = user;
     res.render('links/interesting', data);
});


router.post('/interesting/:id', async (req, res) => {
     let id = req.params.id;
     let pc = await pool.query('SELECT * FROM computador WHERE id = ?', [id]);
     req.flash('success', 'Se envio su mensaje correctamente, nos estaremos comunicando pronto con usted, este atento a su bandeja de entrada');
     res.redirect('/profile');
});

router.post('/sell_done', async (req, res) => {
     let vendedor = req.body.vendedor;
     let username = req.body.cliente;

     let cliente = await pool.query('SELECT * FROM cliente WHERE username = ?', [username]);


     if (Object.keys(cliente).length === 0) {
          req.flash('message', 'El Username del cliente es incorrecto, por favor verificar');
          res.redirect('/links/review_generate_cell');
     } else {
          let clie_nomb = cliente[0].clie_nomb;
     
          var carrito = '0';
          
          var codigoFactura = uuid();
          codigoFactura = codigoFactura.substring(0,28);
          
          var user = await pool.query('SELECT * FROM cliente WHERE clie_nomb = ?',[clie_nomb]);
          let vend = await pool.query('SELECT * FROM vendedor WHERE vend_nombre = ?',[vendedor]);
          
          //recorriendo el storage para ver si hay computadores agregados para vender
          for (let x = 0; x < localStorage.length; x++) {
               
              carrito += (localStorage.key(x)) + ",";
              const venta = {
                  id_usuario:user[0].id ,
                  id_producto: localStorage.key(x),
                  id_factura: codigoFactura,
                  id_vendedor: vend[0].id,
                  cantidad: localStorage.getItem(localStorage.key(x))
             }
       
             await pool.query('INSERT INTO venta SET ?', [venta]);
              
                  
                  let query2 = 'UPDATE computador SET existencias = existencias -'+localStorage.getItem(localStorage.key(x))+' WHERE id = '+localStorage.key(x);
                  
                  await pool.query(query2);
                  
             
              

              
          }
      
          localStorage.removeItem("clie_nomb");
          localStorage.removeItem("clie_apell");
          localStorage.removeItem("vendedor");
     }
 
     req.flash('success', 'Venta realizada exitosamente');
          res.redirect('/links/registrar_venta');

});

module.exports = router;