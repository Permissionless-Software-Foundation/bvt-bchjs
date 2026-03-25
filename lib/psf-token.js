/*
  This library is used to retrieve metrics about the PSF tokens and measure the
  token burn trend.
*/

const GET_TOKEN_DATA_URL = 'https://free-bch.fullstack.cash/bch/getTokenData'
const PSF_TOKEN_ID =
  '38e97c5d7d3585a2cbf3f9580c82ca33985f9cb0845d4dcce220cb709f9538b0'

class PsfToken {
  constructor () {

    // Bind 'this' object to all methods.
    this.runTests = this.runTests.bind(this)
    this.getSlpIndexerData = this.getSlpIndexerData.bind(this)
  }

  async runTests () {
    try {
      console.log('\n\nStarting PSF token metrics...')

      await this.getSlpIndexerData()

      console.log('\n\n')
    } catch (err) {
      console.log('PSF token metrics FAILED')
      console.log(err)
    }
  }

  async getSlpIndexerData () {
    try {
      const res = await fetch(GET_TOKEN_DATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: PSF_TOKEN_ID,
          withTxHistory: false
        })
      })

      const data = await res.json()
      // console.log(JSON.stringify(data, null, 2))

      let maxTokensInCirculation = parseInt(data.tokenData.genesisData.tokensInCirculationStr)
      maxTokensInCirculation = maxTokensInCirculation / 10 ** 8
      console.log(`All PSF tokens ever minted: ${Math.round(maxTokensInCirculation)}`)

      let totalBurned = parseInt(data.tokenData.genesisData.totalBurned)
      totalBurned = totalBurned / 10 ** 8
      console.log(`Total burned: ${Math.round(totalBurned)}`)

      const tokensInCirculation = maxTokensInCirculation - totalBurned
      console.log(`Tokens in circulation: ${Math.round(tokensInCirculation)}`)
    } catch (err) {
      console.log('Error in psf-token.js/getSlpIndexerData()')
      throw err
    }
  }
}

export default PsfToken