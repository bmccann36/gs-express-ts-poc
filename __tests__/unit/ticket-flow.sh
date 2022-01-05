FOO=$(curl -X GET --location "http://localhost:3000/commodities?pageSize=100" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer eyJraWQiOiJcL2xOQ1BmQ2hHaFRta2hcL3lpTlJhdFdNTlJIR1wvRDdsY1ZxYzAyc0NrSHRRPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYTcwY2RmNC0xYjcyLTRjZmUtOWVlMS1hY2FiOTkwMzljYjciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfek5ucFVFa001IiwiY29nbml0bzp1c2VybmFtZSI6IjFhNzBjZGY0LTFiNzItNGNmZS05ZWUxLWFjYWI5OTAzOWNiNyIsIm9yaWdpbl9qdGkiOiIzNGM4YThmOC0wZmM1LTQ2YzYtYjljMS0wZTE4ODhjNjJjNjUiLCJhdWQiOiI3MWsxMjJtaGVvYTd1dXA1aXQ5ZTlzbmxqayIsImV2ZW50X2lkIjoiZTc2M2NhMDItYTFhMS00NWE2LTljZTYtM2Q5ZWZhYmM3ZmU2IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2MzQ5MzY2MjAsImV4cCI6MTYzNDk0MDIyMCwiaWF0IjoxNjM0OTM2NjIwLCJqdGkiOiI2NzdjODI4Ni04MzFhLTQ2YTYtYTUwMC03YjAxOTYxNWVkNmIiLCJlbWFpbCI6ImRhbi5zY2hyaW1wc2hlckBnbWFpbC5jb20ifQ.FuKkqsx04XDBdm-W4SqJLqxkAanG4ALjcB21kmT9Rv2_59sjzQY9YQd3S_n4QZduzkxGlz3d8IkxYqFW-PMUY-1t4Dxe2AV2m7jclZ-2bj65sAOjYtyzZ1rO5Hrq3TJ81mv77IQ5xTw12zQ2ugr0lSSIPqqAfsxOZmKcaPXBZF6PfUOtdveXaIYrQijzLym5fjE0juqvszsJNyZ6gl8s2huKHEHK-m7180Jvvfv8ndMkJ4jelohvSS1axoLeH2EpMDQLJiDr6w-xmJ8eJGO0ZVouWCDS4wws26CPeVbjSekxwXRfa9t3GnCDwI_AyhxTulgyb98o25sC-XjCCHHfxw" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

alum=$(echo $FOO | jq -r '.Items[0].id')
copper=$(echo $FOO | jq -r '.Items[1].id')
steel=$(echo $FOO | jq -r '.Items[2].id')

if [ "$alum" == "null" -o "$copper" == "null" -o "$steel" == "null" ];
then
    echo "Commodities are missing";
    exit -1;
fi

FOO=$(curl -X GET --location "http://localhost:3000/material-types?pageSize=100" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer eyJraWQiOiJcL2xOQ1BmQ2hHaFRta2hcL3lpTlJhdFdNTlJIR1wvRDdsY1ZxYzAyc0NrSHRRPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYTcwY2RmNC0xYjcyLTRjZmUtOWVlMS1hY2FiOTkwMzljYjciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfek5ucFVFa001IiwiY29nbml0bzp1c2VybmFtZSI6IjFhNzBjZGY0LTFiNzItNGNmZS05ZWUxLWFjYWI5OTAzOWNiNyIsIm9yaWdpbl9qdGkiOiIzNGM4YThmOC0wZmM1LTQ2YzYtYjljMS0wZTE4ODhjNjJjNjUiLCJhdWQiOiI3MWsxMjJtaGVvYTd1dXA1aXQ5ZTlzbmxqayIsImV2ZW50X2lkIjoiZTc2M2NhMDItYTFhMS00NWE2LTljZTYtM2Q5ZWZhYmM3ZmU2IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2MzQ5MzY2MjAsImV4cCI6MTYzNDk0MDIyMCwiaWF0IjoxNjM0OTM2NjIwLCJqdGkiOiI2NzdjODI4Ni04MzFhLTQ2YTYtYTUwMC03YjAxOTYxNWVkNmIiLCJlbWFpbCI6ImRhbi5zY2hyaW1wc2hlckBnbWFpbC5jb20ifQ.FuKkqsx04XDBdm-W4SqJLqxkAanG4ALjcB21kmT9Rv2_59sjzQY9YQd3S_n4QZduzkxGlz3d8IkxYqFW-PMUY-1t4Dxe2AV2m7jclZ-2bj65sAOjYtyzZ1rO5Hrq3TJ81mv77IQ5xTw12zQ2ugr0lSSIPqqAfsxOZmKcaPXBZF6PfUOtdveXaIYrQijzLym5fjE0juqvszsJNyZ6gl8s2huKHEHK-m7180Jvvfv8ndMkJ4jelohvSS1axoLeH2EpMDQLJiDr6w-xmJ8eJGO0ZVouWCDS4wws26CPeVbjSekxwXRfa9t3GnCDwI_AyhxTulgyb98o25sC-XjCCHHfxw" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

materialTypeId=$(echo $FOO | jq -r '.Items[0].id')
materialTypeCode=$(echo $FOO | jq -r '.Items[0].code')
if [ "$materialTypeId" == "null" -o "$materialTypeCode" == "null" ];
then
    echo "Materials are missing";
    exit -1;
fi

FOO=$(curl -X GET --location "http://localhost:3000/price-sheets" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer eyJraWQiOiJcL2xOQ1BmQ2hHaFRta2hcL3lpTlJhdFdNTlJIR1wvRDdsY1ZxYzAyc0NrSHRRPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYTcwY2RmNC0xYjcyLTRjZmUtOWVlMS1hY2FiOTkwMzljYjciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfek5ucFVFa001IiwiY29nbml0bzp1c2VybmFtZSI6IjFhNzBjZGY0LTFiNzItNGNmZS05ZWUxLWFjYWI5OTAzOWNiNyIsIm9yaWdpbl9qdGkiOiIzNGM4YThmOC0wZmM1LTQ2YzYtYjljMS0wZTE4ODhjNjJjNjUiLCJhdWQiOiI3MWsxMjJtaGVvYTd1dXA1aXQ5ZTlzbmxqayIsImV2ZW50X2lkIjoiZTc2M2NhMDItYTFhMS00NWE2LTljZTYtM2Q5ZWZhYmM3ZmU2IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2MzQ5MzY2MjAsImV4cCI6MTYzNDk0MDIyMCwiaWF0IjoxNjM0OTM2NjIwLCJqdGkiOiI2NzdjODI4Ni04MzFhLTQ2YTYtYTUwMC03YjAxOTYxNWVkNmIiLCJlbWFpbCI6ImRhbi5zY2hyaW1wc2hlckBnbWFpbC5jb20ifQ.FuKkqsx04XDBdm-W4SqJLqxkAanG4ALjcB21kmT9Rv2_59sjzQY9YQd3S_n4QZduzkxGlz3d8IkxYqFW-PMUY-1t4Dxe2AV2m7jclZ-2bj65sAOjYtyzZ1rO5Hrq3TJ81mv77IQ5xTw12zQ2ugr0lSSIPqqAfsxOZmKcaPXBZF6PfUOtdveXaIYrQijzLym5fjE0juqvszsJNyZ6gl8s2huKHEHK-m7180Jvvfv8ndMkJ4jelohvSS1axoLeH2EpMDQLJiDr6w-xmJ8eJGO0ZVouWCDS4wws26CPeVbjSekxwXRfa9t3GnCDwI_AyhxTulgyb98o25sC-XjCCHHfxw" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

returned=$(echo $FOO | jq -r '.resultsReturned')
if [ "$returned" == "null" -o "$returned" -le 0 ];
then
    echo "Price Sheets are missing";
    exit -1;
fi

FOO=$(curl -X POST --location "http://localhost:3000/inbound-tickets" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer eyJraWQiOiJcL2xOQ1BmQ2hHaFRta2hcL3lpTlJhdFdNTlJIR1wvRDdsY1ZxYzAyc0NrSHRRPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYTcwY2RmNC0xYjcyLTRjZmUtOWVlMS1hY2FiOTkwMzljYjciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfek5ucFVFa001IiwiY29nbml0bzp1c2VybmFtZSI6IjFhNzBjZGY0LTFiNzItNGNmZS05ZWUxLWFjYWI5OTAzOWNiNyIsIm9yaWdpbl9qdGkiOiIzNGM4YThmOC0wZmM1LTQ2YzYtYjljMS0wZTE4ODhjNjJjNjUiLCJhdWQiOiI3MWsxMjJtaGVvYTd1dXA1aXQ5ZTlzbmxqayIsImV2ZW50X2lkIjoiZTc2M2NhMDItYTFhMS00NWE2LTljZTYtM2Q5ZWZhYmM3ZmU2IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2MzQ5MzY2MjAsImV4cCI6MTYzNDk0MDIyMCwiaWF0IjoxNjM0OTM2NjIwLCJqdGkiOiI2NzdjODI4Ni04MzFhLTQ2YTYtYTUwMC03YjAxOTYxNWVkNmIiLCJlbWFpbCI6ImRhbi5zY2hyaW1wc2hlckBnbWFpbC5jb20ifQ.FuKkqsx04XDBdm-W4SqJLqxkAanG4ALjcB21kmT9Rv2_59sjzQY9YQd3S_n4QZduzkxGlz3d8IkxYqFW-PMUY-1t4Dxe2AV2m7jclZ-2bj65sAOjYtyzZ1rO5Hrq3TJ81mv77IQ5xTw12zQ2ugr0lSSIPqqAfsxOZmKcaPXBZF6PfUOtdveXaIYrQijzLym5fjE0juqvszsJNyZ6gl8s2huKHEHK-m7180Jvvfv8ndMkJ4jelohvSS1axoLeH2EpMDQLJiDr6w-xmJ8eJGO0ZVouWCDS4wws26CPeVbjSekxwXRfa9t3GnCDwI_AyhxTulgyb98o25sC-XjCCHHfxw" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher" \
    -d "{
  \"customer\": {
        \"customerCommonIdentifierString\": \"Bob Frog Construction\"
  }
}")

ticketId=$(echo $FOO | jq -r '.id')
customerId=$(echo $FOO | jq -r '.customer.id')
ticketState=$(echo $FOO | jq -r '.status.value')
if [ "$ticketId" == "null" -o "$customerId" == "null" -o "$ticketState" != "INCOMPLETE" ];
then
    echo "Failure Creating a Ticket";
    exit -1;
fi

FOO=$(curl -X GET --location "http://localhost:3000/customers?" --data-urlencode 'filter={"key": "customerCommonIdentifierString", "value": "Bob Frog Construction"}"' \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your-token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

returned=$(echo $FOO | jq -r '.resultsReturned')
customerId2=$(echo $FOO | jq -r '.Items[0].id')

if [ "$customerId2" != "$customerId" -o "$returned" -ne 1 ];
then
    echo "Customer Ids do not match or more than one customer matched";
    exit -1;
fi

FOO=$(curl -X GET --location "http://localhost:3000/inbound-tickets" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your-token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

returned=$(echo $FOO | jq -r '.resultsReturned')

if [ "$returned" -lt 1 ];
then
    echo "More than one Ticket";
    exit -1;
fi

FOO=$(curl -X GET --location "http://localhost:3000/inbound-tickets/$ticketId" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your-token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

ticketId2=$(echo $FOO | jq -r '.id')
ticketState2=$(echo $FOO | jq -r '.status.value')
materials=$(echo $FOO | jq -r '.materials')
if [ "$ticketId2" != "$ticketId" -o "$ticketState2" != "$ticketState" -o "$materials" != "[]" ];
then
    echo "Ticket Ids or states did not match";
    exit -1;
fi

FOO=$(curl -X PUT --location "http://localhost:3000/inbound-tickets/$ticketId" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your-token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher" \
    -d "{
  \"id\": \"$ticketId\",
  \"customer\": {
    \"id\": \"customerId\",
    \"customerCommonIdentifierString\": \"Bob Frog Construction\"
  },
  \"status\": {
    \"value\": \"SCALE_COMPLETE\"
  },
  \"scaleType\": \"Scale1\",
  \"transportationInfo\": {
    \"carrier\": \"Carrier1\",
    \"carrierNumber\": 1234,
    \"trailerNumber\": 88889
  },
  \"truckWeight\": {
    \"gross\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"tare\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"net\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    }
  },
  \"loadWeight\": {
    \"gross\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"tare\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"net\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"deductions\": {
      \"amount\": 10,
      \"units\": \"lbs\"
    }
  },
  \"materials\": [
    {
      \"materialTypeId\": \"$materialTypeId\",
      \"weightAndPrice\": {
        \"gross\": {
          \"amount\": 3973,
          \"units\": \"lbs\",
          \"commonString\": \"3973 lbs\"
        },
        \"tare\": {
          \"amount\": 10,
          \"units\": \"lbs\",
          \"commonString\": \"10 lbs\"
        },
        \"deductions\": [],
        \"netWeight\": {
          \"amount\": 3963,
          \"units\": \"lbs\",
          \"commonString\": \"3963 lbs\"
        },
        \"um\": \"lbs\"
      }
    }
  ]
}")

ticketId2=$(echo $FOO | jq -r '.id')
ticketState2=$(echo $FOO | jq -r '.status.value')
materialId=$(echo $FOO | jq -r '.materials[0].id')
materialState=$(echo $FOO | jq -r '.materials[0].status.value')

if [ "$ticketId2" != "$ticketId" -o "$ticketState2" != "SCALE_COMPLETE" -o "$materialId" == "null" -o "$materialState" != "SWIP" ];
then
    echo "Ticket Update SCALE_COMPLETE Failed";
    echo "$ticketId2 vs $ticketId";
    echo "$ticketState2 vs SCALE_COMPLETE";
    echo "$materialId";
    echo "$materialState vs SWIP";

    exit -1;
fi

FOO=$(curl -X GET --location "http://localhost:3000/materials/$materialId" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your-token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

materialCode=$(echo $FOO | jq -r '.code')
materialTypeId2=$(echo $FOO | jq -r '.materialTypeId')
materialState2=$(echo $FOO | jq -r '.status.value')
if [ "$materialState2" != "$materialState" -o "$materialTypeId2" != "$materialTypeId" ];
then
    echo "Material State or Code Failure";
    exit -1;
fi

FOO=$(curl -X PUT --location "http://localhost:3000/inbound-tickets/$ticketId" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your-token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher" \
    -d "{
  \"id\": \"$ticketId\",
  \"customer\": {
    \"id\": \"$customerId\",
    \"customerCommonIdentifierString\": \"Bob Frog Construction\"
  },
  \"status\": {
    \"value\": \"PRICE_COMPLETE\"
  },
  \"scaleType\": \"Scale1\",
  \"transportationInfo\": {
    \"carrier\": \"Carrier1\",
    \"carrierNumber\": 1234,
    \"trailerNumber\": 88889
  },
  \"truckWeight\": {
    \"gross\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"tare\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"net\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    }
  },
  \"loadWeight\": {
    \"gross\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"tare\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"net\": {
      \"amount\": 100,
      \"units\": \"lbs\"
    },
    \"deductions\": {
      \"amount\": 10,
      \"units\": \"lbs\"
    }
  },
  \"netValue\": {
    \"amount\": 1000,
    \"currency\": \"USD\",
    \"precision\": 0,
    \"priceString\": \"\$1000\"
  },
  \"materials\": [
    {
      \"id\": \"$materialId\",
      \"materialTypeId\": \"$materialTypeId\",
      \"weightAndPrice\": {
        \"gross\": {
          \"amount\": 3973,
          \"units\": \"lbs\",
          \"commonString\": \"3973 lbs\"
        },
        \"tare\": {
          \"amount\": 10,
          \"units\": \"lbs\",
          \"commonString\": \"10 lbs\"
        },
        \"deductions\": [],
        \"netWeight\": {
          \"amount\": 3963,
          \"units\": \"lbs\",
          \"commonString\": \"3963 lbs\"
        },
        \"um\": \"lbs\",
        \"netPrice\": {
          \"commonString\": \"\$0.25/lb\",
          \"currency\": \"usd\",
          \"precision\": 2,
          \"amount\": 25
        },
        \"netValue\": {
          \"commonString\": \"\$990.75\",
          \"currency\": \"usd\",
          \"precision\": 2,
          \"amount\": 99075
        }
      }
    }
  ]
}")

ticketId2=$(echo $FOO | jq -r '.id')
ticketState2=$(echo $FOO | jq -r '.status.value')
materialId=$(echo $FOO | jq -r '.materials[0].id')
materialState=$(echo $FOO | jq -r '.materials[0].status.value')

if [ "$ticketId2" != "$ticketId" -o "$ticketState2" != "PRICE_COMPLETE" -o "$materialId" == "null" -o "$materialState" != "WIP" ];
then
    echo "Ticket Update PRICE_COMPLETE Failed";
    exit -1;
fi

FOO=$(curl -X GET --location "http://localhost:3000/materials/$materialId" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your-token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

materialCode=$(echo $FOO | jq -r '.code')
materialTypeId2=$(echo $FOO | jq -r '.materialTypeId')
materialState2=$(echo $FOO | jq -r '.status.value')
if [ "$materialState2" != "WIP" -o "$materialTypeId2" != "$materialTypeId" ];
then
    echo "Material State or Code Failure After PRICE_COMPLETE";
    exit -1;
fi

FOO=$(curl -X GET --location "http://localhost:3000/inventory/commodity" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer eyJraWQiOiJcL2xOQ1BmQ2hHaFRta2hcL3lpTlJhdFdNTlJIR1wvRDdsY1ZxYzAyc0NrSHRRPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYTcwY2RmNC0xYjcyLTRjZmUtOWVlMS1hY2FiOTkwMzljYjciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfek5ucFVFa001IiwiY29nbml0bzp1c2VybmFtZSI6IjFhNzBjZGY0LTFiNzItNGNmZS05ZWUxLWFjYWI5OTAzOWNiNyIsIm9yaWdpbl9qdGkiOiIzNGM4YThmOC0wZmM1LTQ2YzYtYjljMS0wZTE4ODhjNjJjNjUiLCJhdWQiOiI3MWsxMjJtaGVvYTd1dXA1aXQ5ZTlzbmxqayIsImV2ZW50X2lkIjoiZTc2M2NhMDItYTFhMS00NWE2LTljZTYtM2Q5ZWZhYmM3ZmU2IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2MzQ5MzY2MjAsImV4cCI6MTYzNDk0MDIyMCwiaWF0IjoxNjM0OTM2NjIwLCJqdGkiOiI2NzdjODI4Ni04MzFhLTQ2YTYtYTUwMC03YjAxOTYxNWVkNmIiLCJlbWFpbCI6ImRhbi5zY2hyaW1wc2hlckBnbWFpbC5jb20ifQ.FuKkqsx04XDBdm-W4SqJLqxkAanG4ALjcB21kmT9Rv2_59sjzQY9YQd3S_n4QZduzkxGlz3d8IkxYqFW-PMUY-1t4Dxe2AV2m7jclZ-2bj65sAOjYtyzZ1rO5Hrq3TJ81mv77IQ5xTw12zQ2ugr0lSSIPqqAfsxOZmKcaPXBZF6PfUOtdveXaIYrQijzLym5fjE0juqvszsJNyZ6gl8s2huKHEHK-m7180Jvvfv8ndMkJ4jelohvSS1axoLeH2EpMDQLJiDr6w-xmJ8eJGO0ZVouWCDS4wws26CPeVbjSekxwXRfa9t3GnCDwI_AyhxTulgyb98o25sC-XjCCHHfxw" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

FOO=$(curl -X GET --location "http://localhost:3000/inventory/commodity/$alum" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer eyJraWQiOiJcL2xOQ1BmQ2hHaFRta2hcL3lpTlJhdFdNTlJIR1wvRDdsY1ZxYzAyc0NrSHRRPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYTcwY2RmNC0xYjcyLTRjZmUtOWVlMS1hY2FiOTkwMzljYjciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfek5ucFVFa001IiwiY29nbml0bzp1c2VybmFtZSI6IjFhNzBjZGY0LTFiNzItNGNmZS05ZWUxLWFjYWI5OTAzOWNiNyIsIm9yaWdpbl9qdGkiOiIzNGM4YThmOC0wZmM1LTQ2YzYtYjljMS0wZTE4ODhjNjJjNjUiLCJhdWQiOiI3MWsxMjJtaGVvYTd1dXA1aXQ5ZTlzbmxqayIsImV2ZW50X2lkIjoiZTc2M2NhMDItYTFhMS00NWE2LTljZTYtM2Q5ZWZhYmM3ZmU2IiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE2MzQ5MzY2MjAsImV4cCI6MTYzNDk0MDIyMCwiaWF0IjoxNjM0OTM2NjIwLCJqdGkiOiI2NzdjODI4Ni04MzFhLTQ2YTYtYTUwMC03YjAxOTYxNWVkNmIiLCJlbWFpbCI6ImRhbi5zY2hyaW1wc2hlckBnbWFpbC5jb20ifQ.FuKkqsx04XDBdm-W4SqJLqxkAanG4ALjcB21kmT9Rv2_59sjzQY9YQd3S_n4QZduzkxGlz3d8IkxYqFW-PMUY-1t4Dxe2AV2m7jclZ-2bj65sAOjYtyzZ1rO5Hrq3TJ81mv77IQ5xTw12zQ2ugr0lSSIPqqAfsxOZmKcaPXBZF6PfUOtdveXaIYrQijzLym5fjE0juqvszsJNyZ6gl8s2huKHEHK-m7180Jvvfv8ndMkJ4jelohvSS1axoLeH2EpMDQLJiDr6w-xmJ8eJGO0ZVouWCDS4wws26CPeVbjSekxwXRfa9t3GnCDwI_AyhxTulgyb98o25sC-XjCCHHfxw" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")

FOO=$(curl -X POST --location "http://localhost:3000/finished-goods" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your_token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher" \
    -d "{
 \"finishedGood\": {
  \"materialTypeId\": \"$materialTypeId\",
  \"tag\": \"test-tag\",
  \"materials\": [
    \"65003040-b84a-464d-88fd-d6b82bd53ed6\"
  ],
  \"type\": \"BALE\",
  \"weight\": {
    \"gross\": 105,
    \"net\": 100,
    \"tare\": 5,
    \"units\": \"lbs\"
  },
  \"netValue\": {
    \"amount\": 25000,
    \"currency\": \"USD\",
    \"precision\": 2
  },
  \"status\": {
    \"value\": \"AVAILABLE\",
    \"date\": 1,
    \"userId\": \"9cd3bcd1-373b-438f-a757-7d576294ca42\"
  },
  \"statusHashKey\": \"AVAILABLE\",
  \"dateRangeKey\": 1,
  \"notes\": [
    {
      \"name\": \"Note on truck\",
      \"value\": \"Bob tried to get water jugs in the truck.\",
      \"userId\": \"fredf\",
      \"date\": \"2021-9-12\",
      \"internal\": true
    }
  ]
  }
}")

FOO=$(curl -X GET --location "http://localhost:3000/inventory/commodity" \
    -H "Accept: application/json" \
    -H "Authorization: Bearer your_token" \
    -H "Organization: hulk_smash" \
    -H "Yard: yard1" \
    -H "Userid: dschrimpsher")
