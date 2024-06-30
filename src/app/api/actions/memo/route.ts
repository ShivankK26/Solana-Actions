import { 
    ACTIONS_CORS_HEADERS, 
    ActionGetRequest, 
    ActionPostRequest, 
    ActionPostResponse, 
    MEMO_PROGRAM_ID, 
    createPostResponse } from "@solana/actions";
import { 
    ComputeBudgetProgram, 
    Connection, 
    PublicKey, 
    Transaction, 
    TransactionInstruction, 
    clusterApiUrl } from "@solana/web3.js";

export const GET = (req: Request) => {
    const payload: ActionGetRequest = {
        icon: new URL("/solana_devs.jpg", new URL(req.url).origin).toString(),
        label: "Send Memo",
        description: "This is a super simple action",
        title: "Memo Demo",
    };

    return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS
    });
};

export const OPTIONS = GET;

export const POST = async (req: Request) => {
    try {
      const body: ActionPostRequest = await req.json();
  
      let account: PublicKey;

      try {
        account = new PublicKey(body.account);
      } catch (err) {
        return new Response('Invalid "account" provided', {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        });
      }
  
      const connection = new Connection(
        process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
      );
  
      const transaction = new Transaction().add(
        // note: `createPostResponse` requires at least 1 non-memo instruction
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 1000,
        }),
        new TransactionInstruction({
          programId: new PublicKey(MEMO_PROGRAM_ID),
          data: Buffer.from("this is a simple memo message2", "utf8"),
          keys: [],
        }),
      );
  
      // set the end user as the fee payer
      transaction.feePayer = account;
  
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
  
      const payload: ActionPostResponse = await createPostResponse({
        fields: {
          transaction,
          message: "Post this memo on-chain",
        },
      });
  
      return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS,
      });
      
    } catch (err) {
      console.log(err);
      let message = "An unknown error occurred";
      if (typeof err == "string") message = err;
      return new Response(message, {
        status: 400,
        headers: ACTIONS_CORS_HEADERS,
      });
    }
  };