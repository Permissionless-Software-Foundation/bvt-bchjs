/*
  This library is used to retrieve metrics about the PSF tokens and measure the
  token burn trend.
*/

class PsfToken {
  constructor () {

    // Bind 'this' object to all methods.
    this.runTests = this.runTests.bind(this)
  }

  async runTests () {
    try {
      console.log('\n\nStarting PSF token metrics...')

      console.log('\n\n')
    } catch (err) {
      console.log('PSF token metrics FAILED')
      console.log(err)
    }
  }
}

export default PsfToken