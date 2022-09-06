const cliOptions = require('command-line-args')
const morgan = require('morgan')
const hbs = require('express-handlebars')
const express = require('express')
const metrics = require('./metrics')


const rnd = (range = 14, total = 4) => {
	const nums = []

	for (let i = 0; i < range; i++)
		nums.push(i)

	for (let i = 0; i < range; i++) {
		const idx = Math.floor(Math.random() * range)
		const t = nums[i]
		nums[i] = nums[idx]
		nums[idx] = t
	}

	return nums.splice(0, total)
}

let opt = {}

try {
	opt = cliOptions([ 
		{ name: 'port', alias: 'p', type: Number },
		{ name: 'metricsPort', alias: 'm', type: String },
		{ name: 'name', alias: 'n', type: String },
		{ name: 'hash', type: String },
	])
} catch (err) {
	console.error('Parse CLI options error: ', err)
	if (!process.env.HEROKU_WORKAROUND)
		throw(err)
	opt = {}
}

const port = opt['port'] || opt['p'] || parseInt(process.env.PORT) || 3000
const instanceName = opt['name'] || opt['n'] || process.env.INSTANCE_NAME || 'dov-bear'
const instanceHash = opt['hash'] || process.env.INSTANCE_HASH || '' 

// Prometheus
const metricsPort = opt['metricsPort'] || opt['m'] || parseInt(process.env.METRICS_PORT) || 3100
const { meter, exporter } = metrics(metricsPort)

const requestCounter = meter.createCounter('request_total'
	, { description: 'Number of request' }
)
const imageCounters = [...Array(14).keys()]
		.map(i => meter.createCounter('dovs', { 
				description: `Image dov${i}.gif`,
			})
		)

const app = express()

app.engine('hbs', hbs({ defaultLayout: 'main.hbs' }))
app.set('view engine', 'hbs')

app.use(morgan('common'))

app.get('/healthz', (req, resp) => {
	resp.status(204).end()
})

app.use(express.static(__dirname + '/public'))

app.get([ '/', '/index.html' ], (req, resp) => {
	const total = parseInt(req.query['num']) || 4
	const dovs = rnd(14, total)
	resp.status(200).type('text/html')
	resp.render('index', { dovs, instanceName, instanceHash })
	requestCounter.add(1, { name: instanceName, pid: process.pid })
	dovs.map(v => imageCounters[v].add(1, { name: instanceName, image_number: v }))
})

exporter.startServer()
	.then(() => {
		app.listen(port, () => {
			console.info(`Application started on port ${port} at ${new Date()}`)
			console.info(`Metrics endpoint at /metrics on port ${metricsPort}`)
		})
	})
	.catch(error => {
		console.error('Cannot start metrics: ', error)
	})


