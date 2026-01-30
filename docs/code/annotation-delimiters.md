```
These sequences are annotation delimiters used to mark metadata in the Pali text files:                                    
                                                                                                                             
  Main Sequences                                                                                                             
  ┌────────────┬────────────────────┬──────────────────────────────────────┐                                                 
  │  Sequence  │      Meaning       │               Purpose                │                                                 
  ├────────────┼────────────────────┼──────────────────────────────────────┤                                                 
  │ ^a^...^ea^ │ Annotation markers │ Page references and cross-references │                                                 
  ├────────────┼────────────────────┼──────────────────────────────────────┤                                                 
  │ ^b^...^eb^ │ Bold markers       │ Text emphasis/formatting             │                                                 
  └────────────┴────────────────────┴──────────────────────────────────────┘                                                 
  How ^a^...^ea^ Works                                                                                                       
                                                                                                                             
  The content between ^a^ and ^ea^ contains reference information like:                                                      
                                                                                                                             
  - Page numbers: ^a^T20.0001^ea^ (Thai edition, volume 20, page 1)                                                          
  - Cross-references: ^a^PA.I,1^ea^ (Pali-English Dictionary reference)                                                      
                                                                                                                             
  Processing Behavior                                                                                                        
                                                                                                                             
  In _dprhtml/js/legacy/format.js:159-166, these are handled based on user preferences:                                      
                                                                                                                             
  if (!DPR_G.DPR_prefs["showPages"])                                                                                         
      data = data.replace(/ *\^a\^[^^]*\^ea\^ */g, " ");  // Remove entirely                                                 
  else {                                                                                                                     
      data = data.replace(/\^a\^/g, " z");   // Show with 'z' markers                                                        
      data = data.replace(/\^ea\^/g, "z ");                                                                                  
  }                                                                                                                          
                                                                                                                             
  - When showPages is off: Annotations are stripped from display                                                             
  - When showPages is on: Markers become visible with "z" placeholders                                                       
                                                                                                                             
  Bold Markers                                                                                                               
                                                                                                                             
  ^b^...^eb^ sequences are converted to HTML-like markup (<@>...</@>) for rendering bold/emphasized text.                    
```
