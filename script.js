const START_BALANCE=10000, MINE_COUNT=5;
let state=JSON.parse(localStorage.getItem("casinoVirtualState")||"null")||{balance:START_BALANCE,history:[],bonusDate:null};
let crash={running:false,mult:1,bet:0,timer:null,crashAt:0};
let mines={active:false,bet:0,mines:new Set(),revealed:new Set(),mult:1};
let rouletteChoice=null;
let bj={deck:[],player:[],dealer:[],active:false,bet:0};

const $=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString("pt-BR");
function save(){localStorage.setItem("casinoVirtualState",JSON.stringify(state));renderBalance();renderHistory()}
function renderBalance(){$("balance").textContent=fmt(state.balance)}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function validBet(id){let n=Math.floor(Number($(id).value)); if(!Number.isFinite(n)||n<1){toast("Digite uma aposta válida.");return 0} if(n>state.balance){toast("Saldo virtual insuficiente.");return 0} return n}
function debit(n){state.balance-=n;save()}
function credit(n){state.balance+=n;save()}
function log(game,delta,text){state.history.unshift({game,delta,text,time:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})});state.history=state.history.slice(0,30);save()}
function renderHistory(){const h=$("history");if(!state.history.length){h.innerHTML='<div class="empty">Nenhuma partida ainda.</div>';return}h.innerHTML=state.history.map(x=>`<div class="history-item"><span>${x.game} • ${x.text} <small>${x.time}</small></span><b class="${x.delta>=0?'win':'loss'}">${x.delta>=0?'+':''}${fmt(x.delta)}</b></div>`).join("")}

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".game").forEach(g=>g.classList.remove("active"));btn.classList.add("active");$("game-"+btn.dataset.game).classList.add("active")});
$("resetBtn").onclick=()=>{if(confirm("Reiniciar as moedas virtuais e o histórico?")){state={balance:START_BALANCE,history:[],bonusDate:null};save();toast("Saldo reiniciado!")}};
$("bonusBtn").onclick=()=>{let d=new Date().toISOString().slice(0,10);if(state.bonusDate===d){$("bonusStatus").textContent="Bônus já resgatado hoje.";return}state.bonusDate=d;credit(500);$("bonusStatus").textContent="Você recebeu 500 moedas virtuais!";toast("+500 moedas virtuais 🎁")};

// Crash
$("crashStart").onclick=()=>{if(crash.running)return;let bet=validBet("crashBet");if(!bet)return;debit(bet);crash={running:true,mult:1,bet,timer:null,crashAt:1.2+Math.random()*7.8};$("crashCashout").disabled=false;$("crashStart").disabled=true;$("crashMsg").textContent="O avião está subindo...";let start=performance.now();crash.timer=setInterval(()=>{let elapsed=(performance.now()-start)/1000;crash.mult=Math.pow(1.16,elapsed*5);$("crashMultiplier").textContent=crash.mult.toFixed(2)+"x";$("plane").style.transform=`translate(${Math.min(55,elapsed*6)}%, -${Math.min(65,elapsed*7)}%) rotate(-8deg)`;if(crash.mult>=crash.crashAt)crashEnd(false)},80)};
$("crashCashout").onclick=()=>{if(!crash.running)return;let payout=Math.floor(crash.bet*crash.mult);credit(payout);log("✈️ Avião",payout-crash.bet,`parou em ${crash.mult.toFixed(2)}x`);crashEnd(true)};
function crashEnd(won){clearInterval(crash.timer);crash.running=false;$("crashCashout").disabled=true;$("crashStart").disabled=false;if(!won){$("crashMultiplier").textContent=crash.crashAt.toFixed(2)+"x";$("crashMsg").textContent="💥 O avião caiu!";log("✈️ Avião",-crash.bet,"queda")}else $("crashMsg").textContent="💰 Coleta realizada!"}

// Mines
function makeMines(){let s=new Set();while(s.size<MINE_COUNT)s.add(Math.floor(Math.random()*25));return s}
$("mineStart").onclick=()=>{let bet=validBet("mineBet");if(!bet)return;debit(bet);mines={active:true,bet,mines:makeMines(),revealed:new Set(),mult:1};$("mineMultiplier").textContent="1.00x";$("mineCashout").disabled=false;$("mineStatus").textContent="Encontre as gemas!";drawMines()};
function drawMines(revealAll=false){let g=$("mineGrid");g.innerHTML="";for(let i=0;i<25;i++){let b=document.createElement("button");b.className="mine-cell";let rev=mines.revealed.has(i)||revealAll;if(rev){b.classList.add("revealed");if(mines.mines.has(i)){b.classList.add("mine");b.textContent="💣"}else b.textContent="💎"}b.onclick=()=>minePick(i);g.appendChild(b)}}
function minePick(i){if(!mines.active||mines.revealed.has(i))return;if(mines.mines.has(i)){drawMines(true);mines.active=false;$("mineCashout").disabled=true;$("mineStatus").textContent="💥 Você encontrou uma mina!";log("💣 Minas",-mines.bet,"mina");return}mines.revealed.add(i);mines.mult*=1.18;$("mineMultiplier").textContent=mines.mult.toFixed(2)+"x";drawMines();if(mines.revealed.size===25-MINE_COUNT)mineCollect()}
$("mineCashout").onclick=mineCollect;
function mineCollect(){if(!mines.active||mines.revealed.size===0)return;let payout=Math.floor(mines.bet*mines.mult);credit(payout);log("💣 Minas",payout-mines.bet,`coleta ${mines.mult.toFixed(2)}x`);mines.active=false;$("mineCashout").disabled=true;$("mineStatus").textContent=`💰 Você coletou ${fmt(payout)} moedas!`}

// Slots
const symbols=["🐯","🐰","💎","7️⃣","🍀","🍒"], weights=[22,15,8,4,24,27];
function weighted(){let r=Math.random()*100,s=0;for(let i=0;i<symbols.length;i++){s+=weights[i];if(r<s)return symbols[i]}return symbols[0]}
$("slotSpin").onclick=()=>{let bet=validBet("slotBet");if(!bet)return;debit(bet);$("slotSpin").disabled=true;let ticks=0;let timer=setInterval(()=>{[$("reel1"),$("reel2"),$("reel3")].forEach(r=>r.textContent=weighted());if(++ticks>=12){clearInterval(timer);let a=$("reel1").textContent,b=$("reel2").textContent,c=$("reel3").textContent;let mult=0;if(a===b&&b===c){mult={🐯:5,🐰:6,💎:8,"7️⃣":12,"🍀":4,"🍒":3}[a]||3}else if(a===b||a===c||b===c)mult=1.5;let payout=Math.floor(bet*mult);if(payout){credit(payout);$("slotResult").textContent=`🎉 Prêmio: ${fmt(payout)} moedas (${mult}x)`;log("🐯 Tigrinho",payout-bet,`${mult}x`)}else{$("slotResult").textContent="😅 Não foi dessa vez.";log("🐯 Tigrinho",-bet,"sem combinação")}$("slotSpin").disabled=false}},70)};

// Roulette
document.querySelectorAll(".choice").forEach(b=>b.onclick=()=>{document.querySelectorAll(".choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");rouletteChoice=b.dataset.choice});
$("rouletteSpin").onclick=()=>{let bet=validBet("rouletteBet");if(!bet)return;if(!rouletteChoice){toast("Escolha uma cor.");return}debit(bet);let n=Math.floor(Math.random()*37),color=n===0?"green":(n%2?"red":"black");$("wheelNumber").textContent=n;let mult=color==="green"?14:2;let payout=rouletteChoice===color?bet*mult:0;if(payout){credit(payout);$("rouletteStatus").textContent=`🎉 Saiu ${n} (${color}). Você ganhou ${fmt(payout)}!`;log("🎡 Roleta",payout-bet,`${color} • ${n}`)}else{$("rouletteStatus").textContent=`Saiu ${n} (${color}).`;log("🎡 Roleta",-bet,`${color} • ${n}`)}};

// Blackjack
const suits=["♠","♥","♦","♣"], ranks=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
function newDeck(){let d=[];for(const s of suits)for(const r of ranks)d.push({s,r});return d.sort(()=>Math.random()-.5)}
function cardVal(cards){let total=0,aces=0;cards.forEach(c=>{if(c.r==="A"){total+=11;aces++}else total+=["K","Q","J"].includes(c.r)?10:Number(c.r)});while(total>21&&aces--)total-=10;return total}
function cardHTML(c){return `<div class="card-playing ${["♥","♦"].includes(c.s)?"red-suit":""}">${c.r}${c.s}</div>`}
function drawBJ(hide=true){$("playerCards").innerHTML=bj.player.map(cardHTML).join("");$("dealerCards").innerHTML=(hide?`<div class="card-playing card-back">?</div>`:bj.dealer.map(cardHTML).join(""));$("playerScore").textContent=cardVal(bj.player);$("dealerScore").textContent=hide?"?":cardVal(bj.dealer)}
$("bjDeal").onclick=()=>{let bet=validBet("bjBet");if(!bet)return;debit(bet);bj={deck:newDeck(),player:[],dealer:[],active:true,bet};bj.player=[bj.deck.pop(),bj.deck.pop()];bj.dealer=[bj.deck.pop(),bj.deck.pop()];$("bjHit").disabled=false;$("bjStand").disabled=false;$("bjDeal").disabled=true;drawBJ(true);$("bjStatus").textContent="Sua vez.";if(cardVal(bj.player)===21)bjFinish("blackjack")};
$("bjHit").onclick=()=>{if(!bj.active)return;bj.player.push(bj.deck.pop());drawBJ(true);let v=cardVal(bj.player);if(v>21)bjFinish("bust");else if(v===21)bjFinish("stand")};
$("bjStand").onclick=()=>bjFinish("stand");
function bjFinish(reason){if(!bj.active)return;while(cardVal(bj.dealer)<17)bj.dealer.push(bj.deck.pop());let p=cardVal(bj.player),d=cardVal(bj.dealer),payout=0,result="";if(reason==="blackjack"&&d!==21){payout=Math.floor(bj.bet*2.5);result="Blackjack! 🎉"}else if(p>21){result="Você passou de 21.";payout=0}else if(d>21||p>d){payout=bj.bet*2;result="Você venceu! 🎉"}else if(p===d){payout=bj.bet;result="Empate."}else result="Dealer venceu.";if(payout)credit(payout);log("🃏 21",payout-bj.bet,result);bj.active=false;$("bjHit").disabled=true;$("bjStand").disabled=true;$("bjDeal").disabled=false;drawBJ(false);$("bjStatus").textContent=result}

// Init
renderBalance();renderHistory();drawMines();