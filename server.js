const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai = require('clarifai');


const url = new Clarifai.App({
  apiKey: '25dabbe2a6864ff096f28c9634ec7f10'
});


const db =  knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'test123',
    database : 'face_recognition_database'
  }
});

db.select('*').from('users').then(data => {
	console.log(data);
})

const app = express();
app.use(bodyParser.json());
app.use(cors());

const database = {
	users: [
	{
		id: '123',
		name: 'John',
		email: 'john@gmail.com',
		password: 'cookies',
		entries: 0,
		joined: new Date()

	},

	{
		id: '124',
		name: 'Sally',
		email: 'sally@gmail.com',
		password: 'bananas',
		entries: 0,
		joined: new Date()
	}],
	login: [
	{
		id: '987',
		hash:'',
		email: 'john@gmail.com'
	}
	]
}


app.get('/', (req, res)=> {
	res.send('it is working!');
})

app.post('/signin', (req, res) => {
	const {email, password} = req.body;
	if(!email || !password){
		return res.status(400).json('incorrect form submission');
	}
	db.select('email', 'hash').from('login')
	.where('email', '=', email)
	.then(data => {
		const isValid = bcrypt.compareSync(password, data[0].hash);
		if (isValid){
			return db.select('*').from('users')
			  .where('email', '=', email)
			  .then(user => {
					res.json(user[0])
				})
			  .catch(err => res.status(400).json('Unable to get user'))
		} else{
			res.status(400).json('Wrong credentials')
		}
	})
	.catch(err => res.status(400).json('Wrong credentials'))
})


app.post('/register', (req, res) => {
	const {email, name, password} = req.body;
	if(!email || !name || !password){
		return res.status(400).json('incorrect form submission');
	}
	const hash = bcrypt.hashSync(password);
	db.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('email')
		.then(loginemail => {
			return trx('users')
				.returning('*')
				.insert({
					email: loginemail[0],
					name: name,
					joined: new Date()
				}).then(user =>{
					res.json(user[0]);
		})

		})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	
	.catch(err => res.status(400).json('Unable to register'))
	
})


app.get('/profile/:id', (req, res) => {
	const {id} = req.params;
	db.select('*').from('users').where({id})
	.then(user => {
		if (user.length){
			res.json(user[0]);
		} else {
			res.status(400).json('Not found')
		}
	})
	.catch(err => res.status(400).json('Error getting user'))
})

app.put('/image', (req, res) => {
	const {id} = req.body;
	db('users').where('id', '=', id)
	.increment('entries', 1)
	.returning('entries')
	.then(entries => {
		res.json(entries[0]);
	})
	.catch(err => res.status(400).json('unable to get entries'))
})


app.post('/imageurl', (req, res) => {
	url.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
	.then(data => {
		res.json(data);
	})
	.catch(err => res.status(400).json('unable to work with API'))
})


app.listen(process.env.PORT || 3000, ()=> {
	console.log(`App is running on port ${process.env.PORT}`)
});


/*
/ --> res = this is working
/signin --> POST = success/fail
/register -- POST = user
/ profile/:userId --> GET = user
/image --> PUT --> user

*/