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

        // =================================================================
        // NFT GALLERY FUNCTIONS - NOW WITH REAL API CALLS!
        // =================================================================
        
        function createNFTCard(nft) {
            const card = document.createElement('div');
            card.className = 'nft-card';
            
            const img = document.createElement('img');
            // Handle IPFS URLs by converting to HTTP gateway
            let imageUrl = nft.image;
            if (imageUrl && imageUrl.startsWith('ipfs://')) {
                imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            img.src = imageUrl || 'https://placehold.co/400x400/555/FFF?text=No+Image';
            img.alt = nft.name || 'NFT';
            img.loading = 'lazy';
            img.onerror = function() { 
                this.src = 'https://placehold.co/400x400/555/FFF?text=Image+Unavailable'; 
            };
            
            const info = document.createElement('div');
            info.className = 'nft-card-info';
            
            const title = document.createElement('h3');
            title.textContent = nft.name || `Token #${nft.token_id}`;
            
            const collection = document.createElement('p');
            collection.textContent = `Collection: ${nft.collection || 'Unknown'}`;

            const tokenId = document.createElement('p');
            tokenId.textContent = `Token ID: ${nft.token_id} (${nft.token_type || 'ERC-721'})`;

            const contract = document.createElement('p');
            contract.textContent = `Contract: ${truncateAddress(nft.contract_address)}`;
            contract.style.fontSize = '0.75rem';
            contract.style.opacity = '0.7';

            info.appendChild(title);
            info.appendChild(collection);
            info.appendChild(tokenId);
            info.appendChild(contract);
            
            card.appendChild(img);
            card.appendChild(info);
            
            return card;
        }

        async function fetchAndDisplayNFTs() {
            const walletInput = document.getElementById('wallet-input');
            const chainSelect = document.getElementById('chain-select');
            const nftStatus = document.getElementById('nft-status');
            const nftList = document.getElementById('nft-list');
            const loadButton = document.getElementById('load-nft-button');
            
            const walletAddress = walletInput.value.trim();
            const chain = chainSelect.value;
            
            nftList.innerHTML = '';
            nftStatus.textContent = '';

            // Validate address
            if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
                nftStatus.style.color = '#ff6b6b';
                nftStatus.textContent = '⚠️ Please enter a valid 42-character wallet address (0x...)';
                return;
            }

            // Disable button during fetch
            loadButton.disabled = true;
            loadButton.textContent = 'Loading...';
            
            nftStatus.style.color = '#ffd93d';
            nftStatus.textContent = `🔍 Fetching NFTs from ${chain.toUpperCase()} for ${truncateAddress(walletAddress)}...`;
            
            // Show loading skeletons
            nftList.innerHTML = `
                <div class="loading-skeleton">
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
            `;

            try {
                // ✅ CALL YOUR SECURE CLOUDFLARE WORKER
                console.log('Calling worker:', `${MORALIS_PROXY_URL}?address=${walletAddress}&chain=${chain}`);
                
                const response = await fetch(`${MORALIS_PROXY_URL}?address=${walletAddress}&chain=${chain}`);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Received data:', data);
                
                nftList.innerHTML = ''; // Clear loading skeletons
                
                if (!data.nfts || data.nfts.length === 0) {
                    nftStatus.style.color = '#ccc';
                    nftStatus.textContent = `No NFTs found on ${chain.toUpperCase()} for this address.`;
                    nftList.innerHTML = `
                        <p style="text-align: center; grid-column: 1 / -1; opacity: 0.7;">
                            This wallet doesn't appear to hold any NFTs on the ${chain.toUpperCase()} network.
                        </p>
                    `;
                } else {
                    nftStatus.style.color = '#6bcf7f';
                    nftStatus.textContent = `✅ Found ${data.nfts.length} NFT${data.nfts.length !== 1 ? 's' : ''} on ${chain.toUpperCase()}`;
                    
                    data.nfts.forEach(nft => {
                        nftList.appendChild(createNFTCard(nft));
                    });
                }
            } catch (error) {
                console.error('NFT fetch error:', error);
                
                nftList.innerHTML = '';
                nftStatus.style.color = '#ff6b6b';
                
                if (error.message.includes('429')) {
                    nftStatus.textContent = '⏱️ Rate limit reached. Please try again in a few moments.';
                } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    nftStatus.textContent = '🌐 Network error. Check your internet connection.';
                } else {
                    nftStatus.textContent = `❌ Error: ${error.message}`;
                }
                
                nftList.innerHTML = `
                    <p style="text-align: center; grid-column: 1 / -1; color: #ff6b6b;">
                        Unable to load NFTs. See status message above.
                    </p>
                `;
            } finally {
                loadButton.disabled = false;
                loadButton.textContent = 'Load NFTs';
            }
        }

        // =================================================================
