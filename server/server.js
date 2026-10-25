const app = require('./app');
const { port } = require('./config/env');

app.listen(port, () => {
  console.log(`IndieHub API listening on http://localhost:${port}`);
});
