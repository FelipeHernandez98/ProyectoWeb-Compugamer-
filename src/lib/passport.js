const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const pool = require('../databases');
const helpers = require('../lib/helpers');


passport.use('local.signin', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, async (req, username, password, done) =>{
    
  const rows = await pool.query('SELECT * FROM cliente WHERE username = ?', [username]);
  

  if(rows.length > 0){
      const user = rows [0];
      const validPassword = await helpers.matchPassword(password, user.password);
      if(validPassword){   
            done(null, user, req.flash('success','Bienvenido, '+ user.username));
        
      }else{
          done(null, false, req.flash('message','Contraseña Invalida'));
      }
  }else{
      return done(null, false, req.flash('message','El Usuario Ingresado no existe'));
  }
}));

passport.use('local.signup', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
}, async (req, username, password, done)=>{
    const { name } = req.body;
    const { email } = req.body;
    const { secondname } = req.body;
    const { telefono } = req.body;
    const { direccion } = req.body;
    const newUser = {
        clie_nomb: name,
        clie_apell: secondname,
        clie_tel: telefono,
        clie_dir: direccion,
        username: username,
        password: password,
        email: email      
    }
    newUser.password = await helpers.encryptPassword(password);
    const result = await pool.query('INSERT INTO cliente SET ?', [newUser]);
    newUser.id = result.insertId;
    return done(null,newUser);
}));

passport.serializeUser((user,done)=>{
      done(null, user.id);
      
});


passport.deserializeUser(async (id,done)=>{
    const rows = await pool.query('SELECT * FROM cliente WHERE id = ?',[id]);
    done(null,rows[0]);
});