import React, { useEffect, useState } from 'react';
import MyAlgoWallet, { SignedTx } from '@randlabs/myalgo-connect';
import { useForm } from "react-hook-form";
import algosdk from 'algosdk';
import axios from 'axios';


const algodClient = new algosdk.Algodv2('', 'https://api.testnet.algoexplorer.io', '');
const myAlgoWallet = new MyAlgoWallet();



const txTypeOpts = [
  { value: 'payment tx', name: 'Payment Transaction' },
  { value: 'key reg tx', name: 'Key Registration Transaction' },
  { value: 'asset config tx', name: 'Asset Configuration Transaction' },
  { value: 'asset transfer tx', name: 'Asset Transfer Transaction' },
  { value: 'asset freeze tx', name: 'Asset Freeze Transaction' },
];



function App() {

  const { register, handleSubmit } = useForm();

  const [wallets, setWallets] = useState<string[]>();
  const [selectedWallet, setSelectedWallet] = useState<string>();

  const [balance, setBalance] = useState<number>();
  const [txType, setTxType] = useState<'payment tx' | 'key reg tx' | 'asset config tx' | 'asset transfer tx' | 'asset freeze tx'>('payment tx');

  const [isTxArray, setIsTxArray] = useState(false);
  const [totalTxArrayEl, setTotalTxArrayEl] = useState(2);


  useEffect(() => {
    (async () => {

      if (!selectedWallet) return;

      let accountInfo = await algodClient.accountInformation(selectedWallet).do();
      console.log(accountInfo);

      const _balance = accountInfo.amount;
      setBalance(_balance);

    })();
  }, [selectedWallet]);



  const connectToMyAlgo = async () => {
    try {
      const accounts = await myAlgoWallet.connect();
      console.log(accounts);

      const _wallets = accounts.map(account => account.address);

      setWallets(_wallets);
      setSelectedWallet(_wallets[0]);


    } catch (err) {
      console.error(err);
    }
  }



  const preparePaymentTx = async (formValue) => {
    // let myAccount = algosdk.mnemonicToSecretKey('escape auto cool oil spy trap decrease doctor carbon wet token analyst stand rebuild drum mouse response track novel demand discover step hire able tissue');
    // console.log('myAccount:', myAccount);
    let txn = await algodClient.getTransactionParams().do();

    txn = {
      ...txn,
      ...formValue,
      fee: 1000,
      flatFee: true,
      from: selectedWallet,
      type: 'pay',
      amount: +formValue.amount * 1000000,
      // note: formValue.note && algosdk.encodeObj(formValue.note)
    };

    if (txn.note) txn.note = new Uint8Array(Buffer.from(formValue.note));

    return txn;
  }


  const prepareKeyRegTx = async (formValue) => {
    let txn = await algodClient.getTransactionParams().do();

    txn = {
      ...txn,
      ...formValue,
      fee: 1000,
      flatFee: true,
      from: selectedWallet,
      type: 'keyreg',
      voteFirst: +formValue.voteFirst,
      voteLast: +formValue.voteLast,
      voteKeyDilution: +formValue.voteKeyDilution,
      // note: formValue.note && algosdk.encodeObj(formValue.note)
    };

    if (txn.note) txn.note = new Uint8Array(Buffer.from(formValue.note));

    return txn;
  };


  const prepareAssetConfigTx = async (formValue) => {
    let txn = await algodClient.getTransactionParams().do();

    txn = {
      ...txn,
      ...formValue,
      fee: 1000,
      flatFee: true,
      from: selectedWallet,
      type: 'acfg',
      assetDecimals: +formValue.assetDecimals,
      assetTotal: +formValue.assetTotal,
      assetIndex: formValue.assetIndex && +formValue.assetIndex,
      // assetTotal: formValue.assetTotal*(10**formValue.assetDecimals),
      // note: formValue.note && algosdk.encodeObj(formValue.note)
    };

    if (txn.note) txn.note = new Uint8Array(Buffer.from(formValue.note));

    return txn;
  }


  const prepareAssetTransferTx = async (formValue) => {
    let txn = await algodClient.getTransactionParams().do();

    txn = {
      ...txn,
      ...formValue,
      fee: 1000,
      flatFee: true,
      from: selectedWallet,
      type: 'axfer',
      amount: +formValue.amount,
      assetIndex: +formValue.assetIndex,
      // note: formValue.note && algosdk.encodeObj(formValue.note)
    };

    if (txn.note) txn.note = new Uint8Array(Buffer.from(formValue.note));

    return txn;
  }


  const prepareAssetFreezeTx = async (formValue) => {
    let txn = await algodClient.getTransactionParams().do();

    txn = {
      ...txn,
      ...formValue,
      fee: 1000,
      flatFee: true,
      from: selectedWallet,
      type: 'afrz',
      assetIndex: +formValue.assetIndex,
      // note: formValue.note && algosdk.encodeObj(formValue.note)
    };

    if (txn.note) txn.note = new Uint8Array(Buffer.from(formValue.note));

    return txn;
  }



  const sendTx = async (formValue) => {
    try {

      Object.keys(formValue).forEach(key => {
        if (!formValue[key]) delete formValue[key];
      });

      let txn: any;

      if (txType === 'payment tx') txn = await preparePaymentTx(formValue);
      else if (txType === 'key reg tx') txn = await prepareKeyRegTx(formValue);
      else if (txType === 'asset config tx') txn = await prepareAssetConfigTx(formValue);
      else if (txType === 'asset transfer tx') txn = await prepareAssetTransferTx(formValue);
      else if (txType === 'asset freeze tx') txn = await prepareAssetFreezeTx(formValue);

      console.log('txn:', txn);


      // let txn = algosdk.makePaymentTxnWithSuggestedParams(selectedWallet, receiverAddress, (amount as number)*1000000, undefined, undefined, params);
      // console.log('txn:', txn);


      let signedTxn: SignedTx | SignedTx[];

      if (formValue.tealSrc) {
        const { result } = (await axios.post(
          "https://api.algoexplorer.io/v2/teal/compile",
          formValue.tealSrc,
          { headers: { 'Content-Type': 'Content-Type: text/plain' } })
        ).data;
        console.log(result);

        const program = new Uint8Array(Buffer.from(result, 'base64'));
        // const program = Uint8Array.from([1, 32, 1, 0, 34]);

        const lsig = algosdk.makeLogicSig(program);

        lsig.sig = await myAlgoWallet.signLogicSig(program, selectedWallet as string);

        // create logic signed transaction.
        signedTxn = algosdk.signLogicSigTransaction(txn, lsig);


      } else {
        console.log('isTxArray:', isTxArray);

        let txArr = [] as any;

        if (isTxArray) {
          for (let i = 0; i < totalTxArrayEl; i++) {
            txArr.push({ ...txn, firstRound: txn.firstRound + i });
          }

          const groupID = algosdk.computeGroupID(txArr)

          for (let i = 0; i < totalTxArrayEl; i++) {
            txArr[i].group = groupID;
          }

          console.log(txArr);
        }

        signedTxn = (await myAlgoWallet.signTransaction(isTxArray ? txArr : txn));

      }

      // let signedTxn = txn.signTxn(myAccount.sk);
      // let signedTxn = (await algosdk.signTransaction(txn, myAccount.sk)).blob;
      console.log('signedTxn:', signedTxn);

      // let txId = txn.txID().toString();
      // console.log("Signed transaction with txID: %s", txId);


      let raw: any;

      if (isTxArray) {
        (signedTxn as SignedTx[]).forEach(st => {
          console.log(algosdk.decodeObj(st.blob));
        });

        raw = await algodClient.sendRawTransaction((signedTxn as SignedTx[]).map(s => s.blob)).do();

      } else {
        raw = await algodClient.sendRawTransaction((signedTxn as SignedTx).blob).do();

      }

      console.log('raw:', raw);
      waitForConfirmation(raw.txId);



    } catch (err) {
      console.error(err);
    }
  }



  const waitForConfirmation = async (txId) => {
    let status = (await algodClient.status().do());
    let lastRound = status["last-round"];
    while (true) {
      const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
      console.log('pendingInfo:', pendingInfo);

      if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
        //Got the completed Transaction
        console.log("Transaction " + txId + " confirmed in round " + pendingInfo["confirmed-round"]);
        break;
      }
      lastRound++;
      await algodClient.statusAfterBlock(lastRound).do();
    }
  }



  return (
    <>

      <h1 className="my-5" style={{ textAlign: 'center' }}>Algorand Tests</h1>

      <div style={{ textAlign: 'center' }}>
        {!wallets &&
          <div className="row justify-content-center no-gutters">
            <div className="col-6">
              <button className="btn btn-warning text-light btn-lg btn-block" onClick={connectToMyAlgo}>
                Connect to My Algo
              </button>
            </div>
          </div>
        }

        {wallets &&

          <>

            <div className="row justify-content-center no-gutters">
              <div className="col-6">
                <div className="form-group row">
                  <label className="col-sm-4" htmlFor="wallets-options">From</label>
                  <select className="form-control col-sm-8" name="wallets-options" id="wallets-options" value={selectedWallet} onChange={(e) => setSelectedWallet(e.target.value)}>
                    {wallets.map(wallet => (
                      <option key={wallet} value={wallet}>{wallet}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>


            {!!balance &&
              <div className="row justify-content-center no-gutters mt-3">
                <div className="col-6">
                  <h3>Balance: {balance / 1000000} Algos</h3>
                </div>
              </div>
            }


            <br />

            <div className="row justify-content-center no-gutters">
              <div className="col-6">
                <div className="form-group row">
                  <label className="col-sm-4" htmlFor="tx-options">Select Transaction Type</label>
                  <select className="form-control col-sm-8" name="tx-options" id="tx-options" value={txType} onChange={(e) => setTxType(e.target.value as any)}>
                    {txTypeOpts.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="row justify-content-center no-gutters">
              <div className="col-6">
                <div className="form-group row">
                  <label className="col-sm-4" htmlFor="tx-options">Transaction Array</label>
                  <input className="form-control col-sm-8" type="checkbox" id="txArray" checked={isTxArray} onChange={e => setIsTxArray(e.target.checked)} />
                </div>

                {isTxArray &&
                  <div className="form-group row">
                    <label className="col-sm-4" htmlFor="input2">Total Elements</label>
                    <input className="form-control col-sm-8" min={2} type="number" id="txArrayTotal" value={totalTxArrayEl} onChange={e => setTotalTxArrayEl(+e.target.value)} />
                  </div>
                }
              </div>
            </div>

            <div className="row justify-content-center no-gutters">
              <div className="col-6">
                <div className="card">
                  <div className="card-body">
                    <form autoComplete="off" onSubmit={handleSubmit(sendTx)}>
                      {txType === 'payment tx' &&
                        <>
                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input1">To</label>
                            <input className="form-control col-sm-8" type="text" id="input1" name="to" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input2">Amount</label>
                            <input className="form-control col-sm-8" type="number" id="input2" name="amount" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="closeRemainderTo">Close Remainder To (optional)</label>
                            <input className="form-control col-sm-8" type="text" id="closeRemainderTo" name="closeRemainderTo" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="reKeyTo">Rekey To (optional)</label>
                            <input className="form-control col-sm-8" type="text" id="reKeyTo" name="reKeyTo" ref={register} />
                          </div>
                          {/* 
                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="signer">Signer (optional)</label>
                            <input className="form-control col-sm-8" type="text" id="signer" name="signer" ref={register}/>
                          </div> */}

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="signer">Signer (optional)</label>
                            <select className="form-control col-sm-8" name="signer" id="signer" defaultValue={undefined} ref={register}>
                              <option value={undefined}></option>
                              {wallets.map(wallet => (
                                <option key={wallet} value={wallet}>{wallet}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      }

                      {txType === 'key reg tx' &&
                        <>
                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="voteKey">Vote Key</label>
                            <input className="form-control col-sm-8" type="text" id="voteKey" name="voteKey" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="selectionKey">Selection Key</label>
                            <input className="form-control col-sm-8" type="text" id="selectionKey" name="selectionKey" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="voteFirst">Vote First Valid Round</label>
                            <input className="form-control col-sm-8" type="number" id="voteFirst" name="voteFirst" ref={register} />
                          </div>


                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="voteLast">Vote Last Valid Round</label>
                            <input className="form-control col-sm-8" type="number" id="voteLast" name="voteLast" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="voteKeyDilution">Vote Key Dilution</label>
                            <input className="form-control col-sm-8" type="number" id="voteKeyDilution" name="voteKeyDilution" ref={register} />
                          </div>
                        </>
                      }

                      {txType === 'asset config tx' &&
                        <>
                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="assetIndex">Asset ID</label>
                            <input className="form-control col-sm-8" type="number" id="assetIndex" name="assetIndex" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input4">Name</label>
                            <input className="form-control col-sm-8" type="text" id="input4" name="assetName" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input5">Symbol</label>
                            <input className="form-control col-sm-8" type="text" id="input5" name="assetUnitName" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input6">Decimals</label>
                            <input className="form-control col-sm-8" type="number" id="input6" name="assetDecimals" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input7">Total Supply</label>
                            <input className="form-control col-sm-8" type="number" id="input7" name="assetTotal" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input8">URL (Optional)</label>
                            <input className="form-control col-sm-8" type="text" id="input8" name="assetURL" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input9">Clawback Address (Optional)</label>
                            <input className="form-control col-sm-8" type="text" id="input9" name="assetClawback" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input10">Freeze Address (Optional)</label>
                            <input className="form-control col-sm-8" type="text" id="input10" name="assetFreeze" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input11">Manager Address (Optional)</label>
                            <input className="form-control col-sm-8" type="text" id="input11" name="assetManager" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input12">Reserve Address (Optional)</label>
                            <input className="form-control col-sm-8" type="text" id="input12" name="assetReserve" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input14">Default Frozen (Optional)</label>
                            <input className="form-control col-sm-8" type="checkbox" id="input14" name="assetDefaultFrozen" ref={register} />
                          </div>
                        </>
                      }

                      {txType === 'asset transfer tx' &&
                        <>
                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input15">Asset ID</label>
                            <input className="form-control col-sm-8" type="number" id="input15" name="assetIndex" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input16">To</label>
                            <input className="form-control col-sm-8" type="text" id="input16" name="to" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input17">Amount</label>
                            <input className="form-control col-sm-8" type="number" id="input17" name="amount" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="input18">Revocation Target (optional)</label>
                            <input className="form-control col-sm-8" type="text" id="input18" name="assetRevocationTarget" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="closeRemainderTo">Close Remainder To (optional)</label>
                            <input className="form-control col-sm-8" type="text" id="closeRemainderTo" name="closeRemainderTo" ref={register} />
                          </div>
                        </>
                      }

                      {txType === 'asset freeze tx' &&
                        <>
                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="assetIndex">Asset ID</label>
                            <input className="form-control col-sm-8" type="number" id="assetIndex" name="assetIndex" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="freezeAccount">Freeze Account</label>
                            <input className="form-control col-sm-8" type="text" id="freezeAccount" name="freezeAccount" ref={register} />
                          </div>

                          <div className="form-group row">
                            <label className="col-sm-4" htmlFor="freezeState">Freeze State</label>
                            <input className="form-control col-sm-8" type="checkbox" id="freezeState" name="freezeState" ref={register} />
                          </div>
                        </>
                      }


                      <div className="form-group row">
                        <label className="col-sm-4" htmlFor="note">Note (optional)</label>
                        <textarea className="form-control col-sm-8" id="note" name="note" ref={register}></textarea>
                      </div>

                      <div className="form-group row">
                        <label className="col-sm-4" htmlFor="tealSrc">TEAL source code (optional)</label>
                        <textarea className="form-control col-sm-8" id="tealSrc" name="tealSrc" ref={register}></textarea>
                      </div>

                      <button type="submit" className="btn btn-info btn-lg btn btn-block">SUBMIT</button>

                    </form>
                  </div>
                </div>
              </div>
            </div>





          </>
        }

      </div>



    </>
  );
}

export default App;
