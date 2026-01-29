import { StyleSheet } from 'react-native';

export const Colors = {
  primary: '#2ecc71',
  background: '#f8f9fa',
  text: '#333',
};


export const GlobalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e1e1e1' },
  
 
  topNavbar: {
    height: 60,
    backgroundColor: '#fff', 
    flexDirection: 'row',  
    alignItems: 'center',   
    justifyContent: 'space-between', 
    paddingHorizontal: 20,   
    borderBottomWidth: 1,   
    borderBottomColor: '#eee',
  },


  bottomNavbar: { 
  position: 'absolute',    
  bottom: 40,              
  left: 20,               
  right: 20,               
  height: 75, 
  backgroundColor: '#2ecc71', 
  flexDirection: 'row', 
  alignItems: 'center', 
  justifyContent: 'space-around', 
  borderRadius: 30,        
  
  

  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 5,          
},

  bottomNavbarContainer:{
    backgroundColor: 'hsl(0, 0%, 100%)',
    alignItems:'center',
    justifyContent:'center',
    width:60,
    height:50,
    borderRadius:12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5, 
    
  },

  contentBody: { flex: 1, padding: 10 }, 
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  navText : { fontSize: 10, fontWeight: "bold", color: 'black' }
});