        // CONFIGURATION - YOUR ACTUAL DEPLOYED WORKER
        // =================================================================
        
        // ✅ YOUR SECURE CLOUDFLARE WORKER URL
        const MORALIS_PROXY_URL = 'https://moralis-nft-proxy.bravesub.workers.dev/nfts';
        
        // ✅ YOUR WALLET ADDRESS FOR RECEIVING TIPS
        const CREATOR_WALLET_ADDRESS = '0x852bbfa00dcbfe9632ad6ae01768dd19477b2f73';
        
        // ✅ BAT TOKEN CONTRACT ADDRESS (Ethereum Mainnet)
        const BAT_CONTRACT_ADDRESS = '0x0D8775F648430679A709E98d2b0Cb6250d2887EF';
        
        // =================================================================
        // UTILITY FUNCTIONS
        // =================================================================
        
        function toWei(amount, unit) {
            const multiplier = (unit.toLowerCase() === 'eth' || unit.toLowerCase() === 'matic' || unit.toLowerCase() === 'bat') 
                ? 1e18 
                : 1e9;
            
            if (amount > 1000000) {
                throw new Error('Amount exceeds maximum allowed value');
            }
            
            return BigInt(Math.floor(amount * multiplier));
        }

        function truncateAddress(address, startChars = 6, endChars = 4) {
            if (!address) return '';
            return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
        }
        // WEB3 TIPPING FUNCTIONS
        // =================================================================
        
        async function getChainId(unit) {
            const chainIds = {
                'bat': '0x1',       // BAT is on Ethereum Mainnet
                'eth': '0x1',       // Ethereum Mainnet
                'matic': '0x89',    // Polygon Mainnet
            };
            return chainIds[unit.toLowerCase()] || '0x1';
        }

        async function switchNetwork(targetChainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetChainId }],
                });
                return true;
            } catch (switchError) {
                if (switchError.code === 4902) {
                    if (targetChainId === '0x89') {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: '0x89',
                                    chainName: 'Polygon Mainnet',
                                    nativeCurrency: {
                                        name: 'MATIC',
                                        symbol: 'MATIC',
                                        decimals: 18
                                    },
                                    rpcUrls: ['https://polygon-rpc.com/'],
                                    blockExplorerUrls: ['https://polygonscan.com/']
                                }]
                            });
                            return true;
                        } catch (addError) {
                            throw new Error('Failed to add Polygon network to your wallet');
                        }
                    }
                }
                throw switchError;
            }
        }

        async function sendTip() {
            const tipAmountInput = document.getElementById('tip-amount');
            const tipUnitSelect = document.getElementById('tip-unit');
            const tipMessage = document.getElementById('tip-message');
            const tipButton = document.getElementById('tip-button');
            
            const amount = parseFloat(tipAmountInput.value);
            const unit = tipUnitSelect.value;

            if (isNaN(amount) || amount <= 0) {
                tipMessage.style.color = '#ffd93d';
                tipMessage.textContent = '⚠️ Please enter a valid tip amount greater than 0.';
                return;
            }

            if (amount < 0.001) {
                tipMessage.style.color = '#ffd93d';
                tipMessage.textContent = '⚠️ Minimum tip is 0.001 ' + unit.toUpperCase();
                return;
            }

            tipButton.disabled = true;
            tipMessage.textContent = '🔗 Connecting to wallet...';
            tipMessage.style.color = '#ffd93d';

            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const sender = accounts[0];

                const targetChainId = await getChainId(unit);
                const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
                
                if (currentChainId !== targetChainId) {
                    tipMessage.textContent = `🔄 Switching to ${unit === 'matic' ? 'Polygon' : 'Ethereum'} network...`;
                    await switchNetwork(targetChainId);
                }

                const valueInWei = toWei(amount, unit);
                
                let txHash;
                
                // Handle BAT (ERC-20 token) differently from native tokens
                if (unit === 'bat') {
                    tipMessage.textContent = `💸 Requesting ${amount} BAT transfer...`;
                    
                    // ERC-20 transfer function signature: transfer(address,uint256)
                    // Function selector: 0xa9059cbb
                    const transferFunctionSignature = '0xa9059cbb';
                    
                    // Encode recipient address (pad to 32 bytes)
                    const recipientAddress = CREATOR_WALLET_ADDRESS.toLowerCase().replace('0x', '').padStart(64, '0');
                    
                    // Encode amount (pad to 32 bytes)
                    const amountHex = valueInWei.toString(16).padStart(64, '0');
                    
                    // Combine function signature + recipient + amount
                    const data = transferFunctionSignature + recipientAddress + amountHex;
                    
                    // Send transaction to BAT contract
                    txHash = await window.ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [{
                            from: sender,
                            to: BAT_CONTRACT_ADDRESS,
                            data: data,
                            gas: '0x186A0', // 100,000 gas limit for ERC-20 transfers
                        }],
                    });
                } else {
                    // Handle native tokens (ETH, MATIC)
                    const gasEstimate = await window.ethereum.request({
                        method: 'eth_estimateGas',
                        params: [{
                            from: sender,
                            to: CREATOR_WALLET_ADDRESS,
                            value: '0x' + valueInWei.toString(16),
                        }],
                    });

                    tipMessage.textContent = `💸 Requesting ${amount} ${unit.toUpperCase()} transfer...`;
                    
                    txHash = await window.ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [{
                            from: sender,
                            to: CREATOR_WALLET_ADDRESS,
                            value: '0x' + valueInWei.toString(16),
                            gas: gasEstimate,
                        }],
                    });
                }

                tipMessage.style.color = '#6bcf7f';
                
                const explorerUrl = unit === 'matic' 
                    ? `https://polygonscan.com/tx/${txHash}`
                    : `https://etherscan.io/tx/${txHash}`;
                    
                tipMessage.innerHTML = `✅ Success! <a href="${explorerUrl}" target="_blank" rel="noopener" style="color: var(--color-accent);">View Transaction</a>`;
                
                tipAmountInput.value = '1.0';

            } catch (error) {
                console.error('Tipping error:', error);
                tipMessage.style.color = '#ff6b6b';
                
                if (error.code === 4001) {
                    tipMessage.textContent = '❌ Transaction cancelled by user.';
                } else if (error.code === -32603) {
                    tipMessage.textContent = '❌ Insufficient funds for transaction.';
                } else {
                    tipMessage.textContent = `❌ Error: ${error.message || 'Transaction failed'}`;
                }
            } finally {
                tipButton.disabled = false;
            }
        }

        // =================================================================
        // INITIALIZATION
        // =================================================================
        
        document.addEventListener('DOMContentLoaded', () => {
            const tipButton = document.getElementById('tip-button');
            const loadNftButton = document.getElementById('load-nft-button');
            const tipMessage = document.getElementById('tip-message');

            // Check for Web3 wallet
            if (typeof window.ethereum === 'undefined') {
                tipButton.textContent = "Wallet Not Detected";
                tipButton.disabled = true;
                tipButton.style.opacity = '0.5';
                tipButton.style.cursor = 'not-allowed';
                
                tipMessage.style.color = '#ff6b6b';
                tipMessage.textContent = '⚠️ Please install a Web3 wallet (MetaMask, Brave Wallet, etc.) to send tips.';
            }

            // Event listeners
            tipButton.addEventListener('click', sendTip);
            loadNftButton.addEventListener('click', fetchAndDisplayNFTs);
            
            // Allow Enter key to load NFTs
            document.getElementById('wallet-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    fetchAndDisplayNFTs();
                }
            });

            console.log('✅ Page initialized with Moralis integration!');
            console.log('Worker URL:', MORALIS_PROXY_URL);
