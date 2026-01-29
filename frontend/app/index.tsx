import { Text, View, Image , TouchableOpacity} from 'react-native'; 
import { GlobalStyles, Colors } from '../constants/Styles';
import { Link } from 'expo-router'



export default function HomeScreen() {
  return (
    <View style={GlobalStyles.container}> 
      
     
      <View style={GlobalStyles.topNavbar}>
         <Text style={GlobalStyles.mainTitle}>Smart Grocery</Text>
         
        
         <Image 
          source={require('../assets/images/ProfileIcon.png')} 
          style={{ width: 40, height: 40, borderRadius: 20 }}/>
      </View>

   
      <View style={GlobalStyles.contentBody}>
        <Text style={{ color: Colors.text }}>Welcome back, user!</Text>
      </View>

    
      <View style={GlobalStyles.bottomNavbar}>
        <View style = {GlobalStyles.bottomNavbarContainer}>
          <Text style={GlobalStyles.navText}>Home</Text>
           <Image 
          source={require('../assets/images/HomeIcon.png')} 
          style={{ width: 30, height: 30 }}/>
        </View>
         
        <Link href="/CameraScanner" asChild>
          <TouchableOpacity style = {GlobalStyles.bottomNavbarContainer}>
            <Text style={GlobalStyles.navText}>Scan</Text>
            <Image 
            source={require('../assets/images/ScanIcon.png')} 
            style={{ width: 30, height: 30, borderRadius: 20 }}/>
          </TouchableOpacity>
        </Link>

        <View style = {GlobalStyles.bottomNavbarContainer}>
          <Text style={GlobalStyles.navText}>Inventory</Text>
           <Image 
          source={require('../assets/images/InventoryIcon.png')} 
          style={{ width: 30, height: 30, borderRadius: 20 }}/>
        </View>

        <View style = {GlobalStyles.bottomNavbarContainer}>
          <Text style={GlobalStyles.navText}>Recipes</Text>
           <Image 
          source={require('../assets/images/RecipeIcon.png')} 
          style={{ width: 30, height: 30}}/>
        </View>
      </View>

    </View>
  );
}