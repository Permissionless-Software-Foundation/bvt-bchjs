/*
  Get metrics about the PSF File Pinning Protocol (PSFFPP)
*/

const GET_PIN_INFO_URL = 'https://free-bch.fullstack.cash/ipfs/pins/1'

class Psffpp {
  constructor () {
    // Bind 'this' object to all methods.
    this.runTests = this.runTests.bind(this)
    this.getPinInfo = this.getPinInfo.bind(this)
  }

  async runTests () {
    try {
      console.log('\n\nStarting PSFFPP metrics...')

      await this.getPinInfo()

      console.log('\n\n')
    } catch (err) {
      console.log('PSFFPP metrics FAILED')
      console.log(err)
    }
  }

  async getPinInfo () {
    try {
      const res = await fetch(GET_PIN_INFO_URL, {
        method: 'GET'
      })

      const data = await res.json()
      //   console.log(JSON.stringify(data, null, 2))

      const totalPins = data.pins.pagination.totalItems
      console.log(`Total pins: ${totalPins}`)

      return data
    } catch (err) {
      console.log('Error in psffpp.js/getPinInfo()')
      throw err
    }
  }
}

export default Psffpp
