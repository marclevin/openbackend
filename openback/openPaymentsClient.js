// To install Open Payments client, run: npm install @interledger/open-payments

import pkg from '@interledger/open-payments';
const { createAuthenticatedClient, isPendingGrant } = pkg;
import { randomUUID } from 'crypto';
  
  // Function to initialize the Open Payments client
  export async function getAuthenticatedClient() {
    try {
      const walletAddressUrl = process.env.OPEN_PAYMENTS_CLIENT_ADDRESS;
      const privateKey = process.env.OPEN_PAYMENTS_KEY_64;
      const keyId = process.env.OPEN_PAYMENTS_KEY_ID;
  
      if (!walletAddressUrl || !privateKey || !keyId) {
        throw new Error('Missing configuration for Open Payments client');
      }
  
      const client = await createAuthenticatedClient({
        walletAddressUrl: walletAddressUrl,
        privateKey: Buffer.from(privateKey,'base64'),
        keyId: keyId,
        useHttp: true,
      });
  
      return client;
    } catch (error) {
      console.error('Error initializing Open Payments client:', error);
      throw new Error('Failed to initialize Open Payments client');
    }
  }
  
  // API functions using Open Payments client
  export async function getWalletDetails(walletAddress) {
    try {
      // Initialize client
      const client = await getAuthenticatedClient();
  
      if (walletAddress.id.startsWith("$")) {
        walletAddress.id = walletAddress.id.replace("$", "https://");
      }
  
      // Get wallet address info
      const walletAddressDetails = await client.walletAddress.get({ url: walletAddress.id });
  
      return { success: true, data: walletAddressDetails };
    } catch (error) {
      console.error('Error getting wallet details:', error);
      return { success: false, message: 'Failed to get wallet details' };
    }
  }

  export async function create_incoming(client, value, walletAddressDetails, expiresAt) {
    const grant = await client.grant.request(
      {
        url: walletAddressDetails.authServer,
      },
      {
        access_token: {
          access: [
            {
              type: "incoming-payment",
              actions: ["read", "create", "complete"],
            },
          ],
        },
      },
    );
  
    if (isPendingGrant(grant)) {
      throw new Error("This is an interactive grant! Not expected");
    }
  
    // Create incoming payment
    const incoming = await client.incomingPayment.create(
      {
        url: new URL(walletAddressDetails.id).origin,
        accessToken: grant.access_token.value,
      },
      {
        walletAddress: walletAddressDetails.id,
        incomingAmount: {
          value: value,
          assetCode: walletAddressDetails.assetCode,
          assetScale: walletAddressDetails.assetScale,
        },
        expiresAt: expiresAt,
      },
    );
  
    return incoming;
  }
  
  /**
   * Requests a grant to create a quote on the sender's resource server
   * 
   * @param client
   * @param incomingPaymentUrl - Identifier for the incoming payment the quote is being created for
   * @param walletAddressDetails - Details of the receiver
   * @returns Quote
   */
  export async function createQoute(client, incomingPaymentUrl, walletAddressDetails) {
    // Request Quote grant
    const grant = await client.grant.request(
      {
        url: walletAddressDetails.authServer,
      },
      {
        access_token: {
          access: [
            {
              type: "quote",
              actions: ["create", "read", "read-all"],
            },
          ],
        },
      },
    );
  
    if (isPendingGrant(grant)) {
      throw new Error("Expected non-interactive grant");
    }
  
    // Create quote
    const quote = await client.quote.create(
      {
        url: new URL(walletAddressDetails.id).origin,
        accessToken: grant.access_token.value,
      },
      {
        method: "ilp",
        walletAddress: walletAddressDetails.id,
        receiver: incomingPaymentUrl,
      },
    );
  
    return quote;
  }
  
  /**
   * Get authorization for outgoing payment
   */
  export async function getOutgoingPaymentAuthorization(input) {
    try {
      if (typeof input.walletAddress !== 'string' || input.walletAddress.trim() === '') {
        throw new Error('Invalid input for getting outgoing payment authorization');
      }
  
      // Initialize client
      const client = await getAuthenticatedClient();
  
      if (input.walletAddress.startsWith("$")) {
        input.walletAddress = input.walletAddress.replace("$", "https://");
      }
  
      // Get wallet address details
      const walletAddressDetails = await client.walletAddress.get({ url: input.walletAddress });
  
      // Request outgoing payment authorization grant
      const grant = await client.grant.request(
        {
          url: walletAddressDetails.authServer,
        },
        {
          access_token: {
            access: [
              {
                identifier: walletAddressDetails.id,
                type: 'outgoing-payment',
                actions: ['list', 'list-all', 'read', 'read-all', 'create'],
                limits: {
                  debitAmount: {
                    value: input.debitAmount,
                    assetCode: walletAddressDetails.assetCode,
                    assetScale: walletAddressDetails.assetScale,
                  },
                  receiveAmount: {
                    value: input.receiveAmount,
                    assetCode: walletAddressDetails.assetCode,
                    assetScale: walletAddressDetails.assetScale,
                  },
                },
              },
            ],
          },
          interact: {
            start: ['redirect'],
            finish: {
              method: 'redirect',
              uri: input.redirectUrl,
              nonce: randomUUID(),
            },
          },
        },
      );
  
      if (!isPendingGrant(grant)) {
        throw new Error('Expected interactive grant');
      }
  
      return { success: true, data: grant };
    } catch (error) {
      console.error('Error getting outgoing payment authorization:', error);
      return { success: false, message: 'Failed to get outgoing payment authorization' };
    }
  }
  
  /**
   * Create an outgoing payment
   */
  export async function createOutgoingPayment(input) {
    try {
      if (typeof input.walletAddress !== 'string' || input.walletAddress.trim() === '') {
        throw new Error('Invalid input for creating outgoing payment');
      }
  
      // Initialize client
      const client = await getAuthenticatedClient();
  
      if (input.walletAddress.startsWith("$")) {
        input.walletAddress = input.walletAddress.replace("$", "https://");
      }
  
      // Get the grant since it was still pending
      const grant = (await client.grant.continue(
        {
          accessToken: input.continueAccessToken,
          url: input.continueUri,
        },
        {
          interact_ref: input.interactRef,
        },
      ));
  
      // Create outgoing payment
      const outgoingPayment = await client.outgoingPayment.create(
        {
          url: new URL(input.walletAddress).origin,
          accessToken: grant.access_token.value,
        },
        {
          walletAddress: input.walletAddress,
          quoteId: input.qouteId,
        },
      );
  
      return { success: true, data: outgoingPayment };
    } catch (error) {
      console.error('Error creating outgoing payment:', error);
      return { success: false, message: 'Failed to create outgoing payment' };
    }
  }
  