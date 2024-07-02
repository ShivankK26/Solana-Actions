import { 
    ACTIONS_CORS_HEADERS, 
    ActionGetResponse, 
    ActionPostRequest, 
    ActionPostResponse, 
    createPostResponse 
} from "@solana/actions";

import { 
    Authorized, 
    Connection, 
    Keypair, 
    LAMPORTS_PER_SOL, 
    PublicKey, 
    StakeProgram, 
    SystemProgram, 
    Transaction, 
    clusterApiUrl 
} from "@solana/web3.js";


export const GET = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const { validator } = validatedQueryParams(requestUrl);

        const baseHref = new URL(
            `/api/actions/stake?validator=${validator.toBase58()}`,
            requestUrl.origin, 
        ).toString();

        const payload: ActionGetResponse = {
            title: "Staking SOL",
            icon: new URL("/solana_devs.jpg", requestUrl.origin).toString(),
            description: `Stake your SOL to the ${validator.toBase58()} validator to secure Solana Network.`,
            label: "Stake your SOL",
            links: {
                actions: [
                    {
                        label: "Stake 1 SOL", 
                        href: `${baseHref}&amount=${"1"}`,
                      },
                      {
                        label: "Stake 5 SOL", 
                        href: `${baseHref}&amount=${"5"}`,
                      },
                      {
                        label: "Stake 10 SOL", 
                        href: `${baseHref}&amount=${"10"}`,
                      },
                      {
                        label: "Stake SOL",
                        href: `${baseHref}&amount={amount}`,
                        parameters: [
                            {
                                name: "amount",
                                label: "Enter the amount of SOL to Stake",
                                required: true,
                            },
                        ],
                      },
                ],
            },
        };

        return Response.json(payload, {
            headers: ACTIONS_CORS_HEADERS,
        });
    } catch (error) {
        let message = "An unknown error occured";
        if (typeof error == "string") {
            message = error;
        }

        return new Response(message, {
            status: 400,
            headers: ACTIONS_CORS_HEADERS,
        });
    }
};


export const OPTIONS = GET;


export const POST = async (req: Request) => {
    try {
        const requestUrl = new URL(req.url);
        const { amount, validator } = validatedQueryParams(requestUrl);

        const body: ActionPostRequest = await req.json();

        let account: PublicKey;
        try {
            account = new PublicKey(body.account);
        } catch (error) {
            return new Response('Invalid "account" provided', {
                status: 400,
                headers: ACTIONS_CORS_HEADERS,
            });
        }

        const connection = new Connection(
            process.env.SOLANA_RPC! || clusterApiUrl("devnet"),
        );

        const minStake = await connection.getStakeMinimumDelegation();
        if (amount < minStake.value) {
            throw `Minimum stake value is: ${minStake.value}`;
        }

        const stakeKeypair = Keypair.generate();

        const transaction = new Transaction().add(
            StakeProgram.createAccount({
              stakePubkey: stakeKeypair.publicKey,
              authorized: new Authorized(account, account),
              fromPubkey: account,
              lamports: 1 * LAMPORTS_PER_SOL,
            }),
            
            StakeProgram.delegate({
              stakePubkey: stakeKeypair.publicKey,
              authorizedPubkey: account,
              votePubkey: validator,
            }),
          );

        transaction.feePayer = account;

        transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash;

        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                transaction,
                message: `Stake ${amount} SOL to validator ${validator.toBase58()}`,
            },

            signers: [stakeKeypair],
        });

        return Response.json(payload, {
            headers: ACTIONS_CORS_HEADERS,
        });
    } catch (error) {
        let message = "An unknown error occured.";
        if (typeof error == "string") {
            message = error;
        }

        return new Response(message, {
            status: 400,
            headers: ACTIONS_CORS_HEADERS,
        });
    }
};



function validatedQueryParams(requestUrl: URL) {
    let validator: PublicKey = DEFAULT_VALIDATOR_VOTE_PUBKEY;
    let amount: number = DEFAULT_STAKE_AMOUNT;
  
    try {
      if (requestUrl.searchParams.get("validator")) {
        validator = new PublicKey(requestUrl.searchParams.get("validator")!);
      }
    } catch (err) {
      throw "Invalid input query parameter: validator";
    }
  
    try {
      if (requestUrl.searchParams.get("amount")) {
        amount = parseFloat(requestUrl.searchParams.get("amount")!);
      }
      if (amount <= 0) throw "amount is too small";
    } catch (err) {
      throw "Invalid input query parameter: amount";
    }
  
    return {
      amount,
      validator,
    };
}


export const DEFAULT_VALIDATOR_VOTE_PUBKEY: PublicKey = new PublicKey(
    "5ZWgXcyqrrNpQHCme5SdC5hCeYb2o3fEJhF7Gok3bTVN",
  );
  
export const DEFAULT_STAKE_AMOUNT: number = 1.0;