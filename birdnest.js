//About every 2 seconds, query the drones
//Filter the drones for violations
//	keep the closest confirmed distance to the nest
//Filter new pilots only, since it does not change for new pilots
//Query new pilot information
//Persist pilot information, including last seen, but set 10 minute timeout to remove it (check if last seen is >= 10 minutes here)
//Populate a table with pilots' info, and display the closest confirmed distance
const state = {closestDistance: Infinity, violatingPilots: []}
const xmlParser = new DOMParser()
const xmlEvaluator = new XPathEvaluator()
const withinNDZ = 100
const ox = 250000
const oy = 250000
const DELAY = 2000
const MINUTES = 60 * 1000
const OWNER_URL_BASE = 'https://assignments.reaktor.com/birdnest/pilots/'
const DRONES_URL = 'https://assignments.reaktor.com/birdnest/drones'

const parseXML = str => xmlParser.parseFromString(str, 'text/xml')
const ownerURL = droneId => R.concat(OWNER_URL_BASE, droneId)
const distance = ({x, y}) => Math.hypot(x - ox, y - oy)
const queryDrones = () => fetch(DRONES_URL).then(r => parseXML(r.text()))

const DRONE_DATA = ['serialNumber', 'positionY', 'positionX']
const OWNER_PROPS = ['firstName', 'lastName','phoneNumber', 'email', 'seen']
const ownerProject = R.pick(OWNER_PROPS)
const parseXY = {x: parseFloat, y: parseFloat}
const getTag = node => tag => node.getElementsByTagName(tag)[0].innerHTML

const extractDrones = xml => {
	const evaluateXML = (xpath, doc) => xmlEvaluator.createExpression(xpath)
		.evaluate(doc, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE)
	const capture = evaluateXML('/report/capture[1]', xml).snapshotItem(0)
	const seen = new Date(capture.attributes.item(0).value)
	const drones = evaluateXML('//drone', capture)
	const node2Drone = node => 
		R.pipe(R.map(getTag(node)), R.zip(['droneId', 'x', 'y']),
			R.evolve(parseXY), R.fromPairs, R.assoc('seen', seen))
		(DRONE_DATA)
	return R.range(0, drones.length).map(i => node2Drone(drones.snapshotItem(i)))
}

const handleDrones = drones => {
	const dists = R.map(distance, drones)
	state.closestDistance = R.reduce(R.min, state.closestDistance, dists)
	return R.filter(R.lte(withinNDZ))
}

const queryOwner = drone => fetch(ownerURL(R.prop('droneId', drone)))
	.then(r => r.json())
	.catch(_ => ({}))
	.then(owner => ownerProject(R.mergeLeft(drone, owner)))

const lessThanXMinutes = X => owner =>
	R.pipe(R.prop(['seen']), R.lt(X * MINUTES))
const updateViolators = owners => {
	const violators = // since a pilot owns a single drone, we can perform union on droneId
		R.unionWith(R.eqBy(R.prop('droneId')), owners, state.violatingPilots)
	state.violatingPilots = R.filter(lessThanXMinutes(10), violators)
}

const populateView = () => {
	const distLabel = document.getElementById('label')
	distLabel.innerHTML = 'Closest distance so far: ' + state.closestDistance + ' m'
	const oldBody = document.getElementById('table-body')
	const newBody = document.createElement('tbody')
	items.forEach( item => {
		var row = newBody.insertRow()
		R.range(0, OWNER_PROPS.length).forEach(i => {
			const cell = row.insertCell(i)
			cell.innerHTML = R.propOr('N/A', OWNER_PROPS[i], item)
		})
	})
	oldBody.parentNode.replaceChild(newBody, oldBody)
}

const loop = () => queryDrones()
	.then(extractDrones)
	.then(handleDrones)
	.then(drones => Promise.map(queryOwner))
	.then(updateViolators)
	.then(populateView)

loop()
setInterval(loop, DELAY)
