# PandaGainz

**Official website: https://pandagainz.com**

PandaGainz allows [Bitpanda](https://www.bitpanda.com/?ref=178474763475574477) users to generate a small trading report, which can be used as a helper to create their tax reports or simply to keep track of their trading performance.

Some companies are charging a considerable amount of money to create such reports. People need it mostly for tax purposes. Using PandaGainz you can have a basic report for free :-)

- Runs on Node.js, backend mostly TypeScript
- Dockerfile sample so you can build your own image
- Vanilla-bare-metal-no-frills Javascript + HTML5 + CSS3 frontend
- Reports can be generated as a user friendly table, or directly fetched as JSON
- Reports and API keys are not stored or shared with anyone, and will never be
- Calculations are done using the weighted average method

Please note that I haven't tested all use cases yet, and it will only work with EUR based transactions. If you find bugs, please [create an issue](https://github.com/igoramadas/pandagainz/issues/new).
