import { GraphQLClient } from "graphql-request";

export const graphqlClient = new GraphQLClient(
  "https://indexer.dev.hyperindex.xyz/c67bfa4/v1/graphql"
);

export interface SiloApproval {
  id: string;
  owner: string;
  spender: string;
  value: string; // Consider BigInt if it's a large number
  db_write_timestamp: string; // Or Date if converting
}

export interface GetSiloApprovalResponse {
  Silo_Approval: SiloApproval[];
}

export interface GetSiloDelegateChanged{
  delegator: string;
	fromDelegate: string;
	id: string;
	toDelegate: string;
	db_write_timestamp: string;
}

export interface SiloDelegateChanged{
Silo_DelegateChanged: SiloDelegateChanged[];
}

export interface GetSiloTransfer{
  Silo_Transfer: SiloTransfer[];
}
export interface SiloTransfer{
  value: string;
  from: string;
  id: string;
  to: string;
  db_write_timestamp: string;


}

export interface GetSiloDelegateVotesChanged{
  Silo_DelegateVotesChanged: SiloDelegateVotesChanged[];
}
export interface SiloDelegateVotesChanged{
    newBalance:string;
		previousBalance: string;
		delegate: string;
		id: string;
		db_write_timestamp: string;
}

export interface GetSiloOwnershipTransferred{
  Silo_OwnershipTransferred: SiloOwnershipTransferred[];
}
export interface SiloOwnershipTransferred{
    id: string;
		newOwner: string;
		previousOwner: string;
		db_write_timestamp: string;
}