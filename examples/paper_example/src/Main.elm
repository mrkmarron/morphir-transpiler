
module My.Package.Main exposing (..)

main : List { quantity: Int, price : Float } -> Float
--main l = (l |> List.map (\e -> e.price) |> List.sum) / (toFloat (List.length l))

main l = if (List.isEmpty l) 
    then 0.0
    else (l |> List.map (\e -> e.price) |> List.sum) / (toFloat (List.length l))

