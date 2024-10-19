// First, install express by running:
// npm install express @interledger/open-payments

import express, { json } from 'express';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = 3001;

// Import Items Router
import itemsRouter from './routes/itemsRouter.js';

// Import Open Payments client functions
import {getAuthenticatedClient} from './openPaymentsClient.js';
import { getWalletDetails } from './openPaymentsClient.js';
import { create_incoming } from './openPaymentsClient.js';
import { createQuote } from './openPaymentsClient.js';
import { getOutgoingPaymentAuthorization } from './openPaymentsClient.js';
import { createOutgoingPayment } from './openPaymentsClient.js';

// Middleware to parse JSON bodies from HTTP requests
app.use(json());

// Use the items router for '/items' path
app.use('/items', itemsRouter);

// Endpoint to get wallet details
app.get('/wallet-details', async (req, res) => {
  try {
    const walletAddress = { id: req.body.walletAddress };
    const response = await getWalletDetails(walletAddress);
    res.json(response);
  } catch (error) {
    res.status(500).send('Error getting wallet details');
  }
});

// Endpoint to create an incoming payment
app.post('/create-incoming', async (req, res) => {
  try {
    const { value, walletAddressDetails, expiresAt } = req.body;
    const client = await getAuthenticatedClient();
    const response = await create_incoming(client, value, walletAddressDetails, expiresAt);
    res.json(response);
  } catch (error) {
    // res.status(500).send('Error creating incoming payment');
    // res.status(500).send(error.message);
    throw error;
  }
});

// Endpoint to create a quote
app.post('/create-quote', async (req, res) => {
  try {
    const { incomingPaymentUrl, walletAddressDetails } = req.body;
    const client = await getAuthenticatedClient();
    const response = await createQuote(client, incomingPaymentUrl, walletAddressDetails);
    res.json(response);
  } catch (error) {
    res.status(500).send('Error creating quote');
  }
});

// Endpoint to get outgoing payment authorization
app.post('/outgoing-payment-authorization', async (req, res) => {
  try {
    const response = await getOutgoingPaymentAuthorization(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).send('Error getting outgoing payment authorization');
  }
});

// Endpoint to create an outgoing payment
app.post('/create-outgoing-payment', async (req, res) => {
  try {
    const response = await createOutgoingPayment(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).send('Error creating outgoing payment');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Add an export default
export default app;