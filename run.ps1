function Get-PageContent {
    param (
        $market,
        $voivodeship,
        $district,
        $commune,
        $city,
        $page,
        $area
    )

    while ($retryCount -lt 5) {
        try {
            $data = Invoke-WebRequest -UseBasicParsing -Uri "https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie,rynek-$market/$voivodeship/$district/$commune/$($city)?limit=72&ownerTypeSingleSelect=ALL&by=DEFAULT&direction=DESC&viewType=listing&page=$page" `
                -Headers @{
                "authority"       = "www.otodom.pl"
                "method"          = "GET"
                "scheme"          = "https"
                "accept"          = "*/*"
                "accept-encoding" = "gzip, deflate, br, zstd"
                "accept-language" = "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7"
            }
            Write-Host "Using URL: " "https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie,rynek-$market/$voivodeship/$district/$commune/$($city)?limit=72&ownerTypeSingleSelect=ALL&by=DEFAULT&direction=DESC&viewType=listing&page=$page"
            $jsonMarker = '<script id="__NEXT_DATA__" type="application/json" crossorigin="anonymous">'
            $index = $data.Content.IndexOf($jsonMarker)

            if ($index -ge 0) {
                # Step 3: Copy everything after the JSON data marker into a new variable
                $localJsonData = $data.Content.Substring($index + $jsonMarker.Length)
    
                # Step 4: Remove everything after the JSON data
                $jsonDataEndIndex = $localJsonData.IndexOf('</script>')
                if ($jsonDataEndIndex -ge 0) {
                    $localJsonData = $localJsonData.Substring(0, $jsonDataEndIndex)
                }
    
                # Step 5: Replace escaped double quotes and parse JSON data
                #$jsonData = $jsonData -replace '\\"', '"'
                $jsonObject = ConvertFrom-Json $localJsonData
                
                #$jsonObject | Out-File -FilePath "output.json"
                # Now $jsonObject contains the parsed JSON data without extra backslashes
            } else {
                Write-Host "JSON data marker not found in the HTML content."
            }
            return $jsonObject.props
        }
        catch {
            Write-Warning "Error occurred: $_.Exception.Message"
            $retryCount++
            if ($retryCount -lt 5) {
                Write-Host "Retrying after 2 seconds..."
                Start-Sleep -Seconds 2
            }
        }
    }
    Write-Error "Failed to retrieve data after $maxRetryCount retries."
    exit
}

$market = 'wtorny'
$tosave = 'date market city amount average_price m2_pricec average_area pricesum m2sum'
$areafilter = '' #'&areaMin=1&areaMax=1000'
$currentDate = Get-Date -Format "yyyy-MM-dd"
Write-Output $currentDate

# Read the JSON content from the file
$jsonContent = Get-Content -Raw -Path ".\cities.json" | ConvertFrom-Json

# Loop through each voivodeship, district, and commune to extract cities
foreach ($voivodeship in $jsonContent.voivodeships.psobject.Properties) {
    $voivode = $voivodeship.Name
    foreach ($districtO in $voivodeship.Value.districts.psobject.Properties) {
        $district = $districtO.Name
        foreach ($communeO in $districtO.Value.communes.psobject.Properties) {
            $commune = $communeO.Name
            foreach ($city in $communeO.Value.cities) {
                
                $json = Get-PageContent $market $voivode $district $commune $city 1 $areafilter

                if ($json.pageProps.tracking.listing.result_count -ne 0) {

                    Write-Host `n
                    Write-Host "Total Results: " $json.pageProps.tracking.listing.result_count
                    $pagesTotal = $json.pageProps.tracking.listing.page_count
                    Write-Host "Total Pages:   " $pagesTotal
        
                    for ($i = 1; $i -le $pagesTotal; $i++) {
                        # Code to execute inside the loop
                        Write-Host "Iteration $($i)"
                
                        $json = Get-PageContent $market $voivode $district $commune $city $i $areafilter
                        #$formattedJson = $json | ConvertTo-Json -Depth 100
                        #$formattedJson | Out-File -FilePath "output.json"
                        foreach ($item in $json.pageProps.data.searchAds.items) {
                            #Write-Host $item.id
                            if ($item.totalPrice.value) { 
                                #Write-Host " Cena: " $item.totalPrice.value
                                $price = $price + $item.totalPrice.value
                                $areaInSquareMetersWithPrice = $areaInSquareMetersWithPrice + $item.areaInSquareMeters
                                $priceAmount++
                            }
                            if ($item.relatedAds) { 
                                foreach ($related in $item.relatedAds) { 
                                    #Write-Host "    Related Listing: " $related.id
                                    $amountcount++
                                    if ($related.totalPrice.value) { 
                                        #Write-Host "    related Cena: " $related.totalPrice.value
                                        $price = $price + $related.totalPrice.value
                                        $areaInSquareMetersWithPrice = $areaInSquareMetersWithPrice + $related.areaInSquareMeters
                                        $priceAmount++
                                    }
                                    $areaInSquareMetersTotal = $areaInSquareMetersTotal + $related.areaInSquareMeters
                                }

                            }
                            else {
                                #Write-Host "No Related Listing" 
                            }
                            $areaInSquareMetersTotal = $areaInSquareMetersTotal + $item.areaInSquareMeters
                            $amountcount++
                        }
                    }


                    if ($amountcount -eq $json.pageProps.tracking.listing.result_count) {
                        Write-Host "Amount OK:  " $amountcount 
                        Write-Host "With price: " $priceAmount
                        $priceTotalFormatted = "{0:N}" -f $price
                        Write-Host $city $market "Price sum total:        " $priceTotalFormatted " PLN"
                        $areaInSquareMetersTotal2 = "{0:N}" -f $areaInSquareMetersTotal
                        Write-Host $city $market "total m2:               " $areaInSquareMetersTotal2 " m2"
                        $areaInSquareMetersWithPrice2 = "{0:N}" -f $areaInSquareMetersWithPrice
                        Write-Host $city $market "total m2 with price:    " $areaInSquareMetersWithPrice2 " m2"
                        $averagePrice = ([math]::Round(($price / $priceAmount), 2))
                        $formattedPrice = "{0:N}" -f $averagePrice
                        Write-Host $city $market "Average price:          " $formattedPrice " PLN"
                        $formattedM2Price = ([math]::Round(($price / $areaInSquareMetersWithPrice), 2))
                        Write-Host $city $market "m2 price:               " $formattedM2Price " PLN/m2"
                        $averagArea = ([math]::Round(($areaInSquareMetersWithPrice / $priceAmount), 2))
                        $saveline = "$currentDate $market $city $amountcount $averagePrice $formattedM2Price $averagArea $price $areaInSquareMetersTotal"
                        # Append the line to the file
                        Add-Content -Path "$($city)_flatdata.txt" -Value $saveline
                    }
                    else { Write-Host "Amount NOT OK" }
                    $amountcount = 0
                    $priceAmount = 0
                    $price = 0
                    $areaInSquareMetersWithPrice = 0
                    $areaInSquareMetersTotal = 0
                } else {
                    Write-Host `n
                    Write-Host "No data for " $city
                    $amountcount = 0
                    $priceAmount = 0
                    $price = 0
                    $areaInSquareMetersWithPrice = 0
                    $areaInSquareMetersTotal = 0
                }
            }
        }
    }
} Write-Host $tosave
