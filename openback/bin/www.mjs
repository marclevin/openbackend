// /home/mousecatcher/openbackend/openback/bin/www

import http from 'http';
import app from '../app.mjs';
const port = process.env.PORT || 3000;

app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});