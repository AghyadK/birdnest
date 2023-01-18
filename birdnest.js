//About every 2 seconds, query the drones
//Filter the drones for violations
//	keep the closest confirmed distance to the nest
//Filter new pilots only, since it does not change for new pilots
//Query new pilot information
//Persist pilot information, including last seen, but set 10 minute timeout to remove it (check if last seen is >= 10 minutes here)
//Populate a table with pilots' info, and display the closest confirmed distance
const state = {closestDistance: Infinity, violatingPilots: []}
const xmlParser = new DOMParser()
const withinNDZ = 100
const ox = 250000
const oy = 250000
const DELAY = 2000
const OWNER_URL_BASE = 'https://assignments.reaktor.com/birdnest/pilots/'
const DRONES_URL = 'https://assignments.reaktor.com/birdnest/drones'

const parseXML = str => xmlParser.parseFromString(str, 'text/xml')
const ownerURL = droneId => R.concat(OWNER_URL_BASE, droneId)
const distance = ({x, y}) => Math.hypot(x - ox, y - oy)
const queryDrones = () => fetch(DRONES_URL).then(r => parseXML(r.text()))

const extractDrones = xml => ([{id ,x, y, seen}]) //TODO

const handleDrones = drones => {
	const dists = R.map(distance, drones)
	state.closestDistance = R.reduce(R.min, state.closestDistance, dists)
	return R.filter(R.lte(withinNDZ))
}
const OWNER_PROPS = ['firstName', 'lastName','phoneNumber', 'email', 'seen']
const ownerProject = R.pick(OWNER_PROPS)

const queryOwner = drone => fetch(ownerURL(R.prop('id', drone)))
	.then(r => r.json())
	.catch(_ => ({}))
	.then(owner => ownerProject(R.mergeLeft(drone, owner)))

const updateViolators = 

const populateView() {
	const distLabel = document.getElementById('label')
	distLabel.innerHTML = 'Closest distance so far: ' + state.closestDistance + ' m'
	const oldBody = document.getElementById('table-body')
	const newBody = document.createElement('tbody');
	items.forEach( item => {
		var row = newBody.insertRow()
		for (let i = 0; i < OWNER_PROPS.length; i++) {
			let cell = row.insertCell(i)
			cell.innerHTML = item[OWNER_PROPS[i]]
		}
	})
	oldBody.parentNode.replaceChild(newBody, oldBody)
}

const loop = () => queryDrones()
	.then(extractDrones)
	.then(handleDrones)
	.then(drones => Promise.map(queryOwner))
	.then(updateViolators)
	.then(populateView)
	//.then(() => setTimeout(loop, DELAY))
