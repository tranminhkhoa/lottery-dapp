module.exports = `
pragma solidity 0.5.9;

contract Lottery {
    address payable private dealer; // dealer's address
    address payable[] private players; // players' addresses
    uint8[] private bets; // players' betting numbers, i.e. players[i] bets number bets[i]
    mapping (address => bool) private playerExists; // check if a player already joined the lottery
    mapping (uint8 => address payable[]) private whoBet; // whoBet[x] stores players who bet number x

    uint8 private winNumber; // winning number
    uint private dealerShare; // dealer share at the end of the lottery
    uint private winnerShare; // winner share at the end of the lottery
    bool private open; // true if lottery is opening, false otherwise

    // events that will be fired on changes.
    event LotteryOpenedBy(address dealer);
    event NewPlayer(address player, uint8 betNum);
    event LotteryEnded();

    constructor() public {
        dealer = msg.sender;
        open = true;
        emit LotteryOpenedBy(dealer);
    }

    modifier onlyOwner() {
        require(msg.sender == dealer, "Access denied! Only dealer can perform this action");
        _;
    }
    
    modifier notOwner() {
        require(msg.sender != dealer, "Access denied! Dealer cannot perform this action");
        _;
    }

    modifier isOpening() {
        require(open == true, "Sorry! The lottery session was expired");
        _;
    }

    modifier afterClosed() {
        require(open == false, "Please wait until the end of the lottery");
        _;
    }

    function joinLottery(uint8 bet) public payable notOwner isOpening {
        require(msg.value == 1 ether, "You must deposit exactly 1 ether to join the lottery");
        require(!playerExists[msg.sender], "You can bet only once");
        require(players.length < 100, "You cannot join since there are 100 players is playing");
        require(bet < 100, "Bet number must be in interval [0,99]");
        players.push(msg.sender);
        bets.push(bet);
        playerExists[msg.sender] = true;
        whoBet[bet].push(msg.sender);
        emit NewPlayer(msg.sender, bet);
    }

    function getBalance() public view returns(uint) {
        return address(this).balance;
    }

    function getDealer() public view returns(address payable) {
        return dealer;
    }

    function getPlayers() public view returns(address payable[] memory, uint8[] memory) {
        return (players, bets);
    }

    function getWinners() public view afterClosed returns(address payable[] memory) {
        return whoBet[winNumber];
    }

    function getWinningNumber() public view afterClosed returns(uint) {
        return winNumber;
    }

    function endLottery() public onlyOwner isOpening {
        open = false; // end the lottery first
        dealerShare = address(this).balance;
        winnerShare = 0;
        winNumber = uint8(block.timestamp) % 100;
        if (players.length != 0) { // if there is at least one player
            if (whoBet[winNumber].length == 0) // if there is no winner
                dealer.transfer(dealerShare); // then dealer takes all
            else { // if there is at least one winner then update shares
                dealerShare = address(this).balance / 10; // refund 10% to dealer's account
                winnerShare = (address(this).balance - dealerShare) / whoBet[winNumber].length; // 90% fund will be equally shared by winners
                dealer.transfer(dealerShare); // transfer shared fund to dealer
                for (uint i = 0; i < whoBet[winNumber].length; i++) // transfer shared fund to winners
                    whoBet[winNumber][i].transfer(winnerShare);
            }
        }
        emit LotteryEnded();
    }
}
`