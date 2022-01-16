const serverUrl = "https://mcxzyj6bkirk.usemoralis.com:2053/server"; //Server url from moralis.io
const appId = "5j4AHK8HTwvamQhflmBYuhPMZaA2RwyuXhVKrlMP"; // Application id from moralis.io

let currentTrade = {};
let currentSelectSide;
let tokens;

let is_authenticated = false;

let available_tokens;


//runs when the page loads
async function init() {
  //start the loader..
  startLoader();
  //remove the img 
  document.querySelector("#to_token_img").style.display = "none";
  await Moralis.start({ serverUrl, appId });
  await Moralis.enableWeb3();
  await listAvailableTokens();

if(available_tokens != null){
    //tokens are ready
    $("#loading-modal").modal("hide");
    document.querySelector("#to_token_img").style.display = "inline";
}

  currentUser = Moralis.User.current();
  if (currentUser) {
    document.getElementById("swap_button").disabled = false;
    document.querySelector("#wallet-connect-info").innerHTML = `<small class='text-success'>You are now connected</small>`;
 
    document.getElementById("swap_button").disabled = false;
    //remove the login button
    document.getElementById("login_button").innerText = "Detach from Metamask";
    document.getElementById("login_button").classList.remove("btn-primary");
    document.getElementById("login_button").classList.add("btn-danger");
    document.getElementById("login_button").setAttribute("onclick", "logoutFromMetamask()");
 
  }

  //once the page has loaded..
  //get the quotes..


}

async function listAvailableTokens() {
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
  });

  tokens = result.tokens;

  if(tokens){
      //pass these tokens to the DOM..
      //get the first token
      console.log("Tokens: ", tokens);
      available_tokens = tokens;
  }

  let parent = document.getElementById("token_list");
  for (const address in tokens) {
    let token = tokens[address];
    let div = document.createElement("div");
    div.setAttribute("data-address", address);

    if(token.symbol == "ETH"){
       // document.querySelector("#from_token_img").src= `${token.logoURI}`;
        document.querySelector("#from_token_img").src= ``;
        document.querySelector("#from_token_text").innerText = " Select Token ⥥";
        document.querySelector("#to_token_img").src= ``;
        document.querySelector("#to_token_text").innerText = " Select Token";

        selectToken(address);
    }

    div.className = "token_row";
    let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(address);
    };
    parent.appendChild(div);
  }
}

function selectToken(address) {
  closeModal();
  //console.log("Tokens ", tokens);
  currentTrade[currentSelectSide] = tokens[address];
  console.log(currentTrade);
  renderInterface();
  getQuote();
}

function renderInterface() {
  if (currentTrade.from) {
    console.log("current trade: ", currentTrade);
    document.getElementById("from_token_img").src = currentTrade.from.logoURI;
    document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
  }
  if (currentTrade.to) {
    document.getElementById("to_token_img").src = currentTrade.to.logoURI;
    document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
  }
}


//log in the user..

async function login() {
  try {
    currentUser = Moralis.User.current();
   // console.log("Current user: ", currentUser);
    //console.log("moralis: ", Moralis.User)
    if (!currentUser) {
      currentUser = await Moralis.authenticate();

      if(currentUser){
          is_authenticated = true;

          //change interface..
          document.querySelector("#wallet-connect-info").innerHTML = `<small class='text-success'>You are now connected</small>`;
      }
    }
    document.getElementById("swap_button").disabled = false;
    //remove the login button
    document.getElementById("login_button").innerText = "Detach from Metamask";
    document.getElementById("login_button").classList.remove("btn-primary");
    document.getElementById("login_button").classList.add("btn-danger");
    document.getElementById("login_button").setAttribute("onclick", "logoutFromMetamask()");
  } catch (error) {
    console.log(error);
  }
}




async function logoutFromMetamask(){
    //logout from metamask ..
    const checkLogout = await Moralis.User.logOut();

    if(isEmpty(checkLogout)){
        //change the login_button
        document.getElementById("swap_button").disabled = true;
        document.getElementById("login_button").innerText = "Sign in with Metamask";
        document.getElementById("login_button").classList.remove("btn-danger");
        document.getElementById("login_button").classList.add("btn-primary");
        document.getElementById("login_button").removeAttribute("onclick");
        location.reload();

    }

}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function startLoader(){

    loader = `<div class="modal" tabindex="-1" id="loading-modal" style="background-color: transparent;" data-backdrop='static'>
            <div class="modal-dialog modal-dialog-centered" style="background-color: transparent;">
              <div class="modal-content" style="background-color: transparent;">
                <div class="modal-body">
                <div class="d-flex justify-content-center">
                <div class="spinner-border text-white" role="status">
                  <span class="sr-only">Loading...</span>
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>`;

      
    $("#loaders").html(loader);
    $("#loading-modal").modal("show");


}

function openModal(side) {
  currentSelectSide = side;
  document.getElementById("token_modal").style.display = "block";
}
function closeModal() {
  document.getElementById("token_modal").style.display = "none";
}

async function getQuote() {
  if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;

  let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);

  const quote = await Moralis.Plugins.oneInch.quote({
    chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount: amount,
  });
  console.log(quote);
  document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
  document.getElementById("to_amount").value = quote.toTokenAmount / 10 ** quote.toToken.decimals;
}

async function trySwap() {
  let address = Moralis.User.current().get("ethAddress");
  let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);
  if (currentTrade.from.symbol !== "ETH") {
    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
      chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
      fromTokenAddress: currentTrade.from.address, // The token you want to swap
      fromAddress: address, // Your wallet address
      amount: amount,
    });
    console.log(allowance);
    if (!allowance) {
      await Moralis.Plugins.oneInch.approve({
        chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
        tokenAddress: currentTrade.from.address, // The token you want to swap
        fromAddress: address, // Your wallet address
      });
    }
  }
  try {
    let receipt = await doSwap(address, amount);
    alert("Swap Complete");
  } catch (error) {
    console.log(error);
  }
}

function doSwap(userAddress, amount) {
  return Moralis.Plugins.oneInch.swap({
    chain: "eth", // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount: amount,
    fromAddress: userAddress, // Your wallet address
    slippage: 1,
  });
}

init();

//close the modal...
document.getElementById("modal_close").onclick = closeModal;

//from token select
document.getElementById("from_token_select").onclick = () => {
  openModal("from");
};


document.getElementById("to_token_select").onclick = () => {
  openModal("to");
};
document.getElementById("login_button").onclick = login;
document.getElementById("from_amount").onblur = getQuote;
document.getElementById("swap_button").onclick = trySwap;