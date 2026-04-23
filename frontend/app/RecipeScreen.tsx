import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authFetch } from '../constants/api';
import BottomNav from '../components/BottomNav';

const CUISINE_OPTIONS = ['Any', 'British', 'Italian', 'Indian', 'Chinese', 'Mexican', 'Mediterranean'];
const TIME_OPTIONS = ['Any', '15', '30', '45', '60'];

export default function RecipeScreen() {
  const [allergies, setAllergies] = useState('');
  const [calories, setCalories] = useState('');
  const [cuisine, setCuisine] = useState('Any');
  const [maxTime, setMaxTime] = useState('Any');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const generateRecipes = async () => {
    try {
      setLoading(true);
      setRecipes([]);
      setExpandedIndex(null);

      const body: any = {};
      if (allergies) body.allergies = allergies;
      if (calories) body.calories = calories;
      if (cuisine !== 'Any') body.cuisine = cuisine;
      if (maxTime !== 'Any') body.max_time = maxTime;

      const response = await authFetch('/recipes/suggest', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!response) return;

      const result = await response.json();

      if (result.status === 'success' && result.recipes.length > 0) {
        setRecipes(result.recipes);
      } else {
        Alert.alert('No Recipes', result.message || 'No recipes found. Try different filters.');
      }
    } catch (error) {
      console.log('Recipe error:', error);
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

 

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.header}>Recipes</Text>
      <Text style={s.subheader}>Based on your inventory</Text>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Filter Toggle */}
        <TouchableOpacity
          style={s.filterToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={s.filterToggleText}>
            {showFilters ? 'Hide Preferences' : 'Set Preferences'}
          </Text>
        </TouchableOpacity>

        {/* Filters */}
        {showFilters && (
          <View style={s.filterCard}>
            <Text style={s.filterLabel}>Allergies / Dietary</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. nuts, gluten-free, vegetarian"
              placeholderTextColor="#BBB"
              value={allergies}
              onChangeText={setAllergies}
            />

            <Text style={s.filterLabel}>Calorie Target (per serving)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 500"
              placeholderTextColor="#BBB"
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />

            <Text style={s.filterLabel}>Cuisine</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {CUISINE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.chip, cuisine === opt && s.chipActive]}
                  onPress={() => setCuisine(opt)}
                >
                  <Text style={[s.chipText, cuisine === opt && s.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.filterLabel}>Max Cooking Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              {TIME_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.chip, maxTime === opt && s.chipActive]}
                  onPress={() => setMaxTime(opt)}
                >
                  <Text style={[s.chipText, maxTime === opt && s.chipTextActive]}>
                    {opt === 'Any' ? 'Any' : `${opt} min`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Generate Button */}
        <TouchableOpacity
          style={s.generateBtn}
          onPress={generateRecipes}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.generateBtnText}>Find Recipes</Text>
          )}
        </TouchableOpacity>

        {/* Results being listed out*/}
        {recipes.map((recipe, index) => {
        
          const isExpanded = expandedIndex === index;

          return (
            <TouchableOpacity
              key={recipe.id}
              style={s.card}
              onPress={() => setSelectedRecipe(recipe)}
              activeOpacity={0.8}
            >
              {/* Recipe Image */}
              {recipe.image ? (
                <Image source={{ uri: recipe.image }} style={s.recipeImage} />
              ) : (
                <View style={[s.recipeImage, { backgroundColor: '#EEEEF2' }]} />
              )}

              {/* Title and Score */}
              <View style={s.cardHeader}>
                <Text style={s.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
               
              </View>

              {/* Meta */}
              <View style={s.metaRow}>
                {recipe.cooking_time !== 'N/A' && (
                  <View style={s.metaBadge}>
                    <Text style={s.metaText}>{recipe.cooking_time} min</Text>
                  </View>
                )}
                {recipe.calories > 0 && (
                  <View style={s.metaBadge}>
                    <Text style={s.metaText}>{recipe.calories} cal</Text>
                  </View>
                )}
                {recipe.servings !== 'N/A' && (
                  <View style={s.metaBadge}>
                    <Text style={s.metaText}>{recipe.servings} servings</Text>
                  </View>
                )}
                
              </View>

              {/* Ingredients from inventory */}
              {recipe.ingredients_from_inventory?.length > 0 && (
                <View style={s.ingredientSection}>
                  <Text style={s.fromInventoryLabel}>From your inventory ({recipe.used_count})</Text>
                  <Text style={s.ingredientList}>
                    {recipe.ingredients_from_inventory.join(', ')}
                  </Text>
                </View>
              )}

              {/* Extra ingredients needed */}
              {recipe.extra_ingredients_needed?.length > 0 && (
                <View style={s.ingredientSection}>
                  <Text style={s.extraLabel}>Extra needed ({recipe.missed_count})</Text>
                  <Text style={s.ingredientList}>
                    {recipe.extra_ingredients_needed.join(', ')}
                  </Text>
                </View>
              )}

              {/* Diets */}
              {recipe.diets?.length > 0 && (
                <View style={s.dietRow}>
                  {recipe.diets.map((diet: string) => (
                    <View key={diet} style={s.dietBadge}>
                      <Text style={s.dietText}>{diet}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={s.expandHint}>
                {isExpanded ? 'Tap to collapse' : 'Tap for details'}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
      <Modal visible={!!selectedRecipe} transparent animationType="slide">
  <View style={s.modalOverlay}>
    <View style={s.modalContent}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{selectedRecipe?.title}</Text>
          <TouchableOpacity onPress={() => setSelectedRecipe(null)} style={s.modalClose}>
            <Text style={s.modalCloseText}>X</Text>
          </TouchableOpacity>
        </View>

        {/* Image */}
        {selectedRecipe?.image && (
          <Image source={{ uri: selectedRecipe.image }} style={s.modalImage} />
        )}

        {/* Meta */}
        <View style={s.modalMeta}>
          {selectedRecipe?.cooking_time !== 'N/A' && (
            <Text style={s.modalMetaText}>{selectedRecipe?.cooking_time} min</Text>
          )}
          {selectedRecipe?.calories > 0 && (
            <Text style={s.modalMetaText}>{selectedRecipe?.calories} cal</Text>
          )}
          {selectedRecipe?.servings !== 'N/A' && (
            <Text style={s.modalMetaText}>{selectedRecipe?.servings} servings</Text>
          )}
        </View>

        {/* Ingredients */}
        <Text style={s.modalSectionTitle}>Ingredients</Text>
        {selectedRecipe?.ingredients?.map((ing: any, i: number) => (
          <Text key={i} style={s.ingredientItem}>
            {ing.amount} {ing.unit} {ing.name}
          </Text>
        ))}

        {/* Instructions */}
        <Text style={s.modalSectionTitle}>Instructions</Text>
        <Text style={s.instructionText}>
          {selectedRecipe?.instructions
            ? selectedRecipe.instructions.replace(/<[^>]*>/g, '')
            : 'No instructions available. Check the source link.'}
        </Text>
      </ScrollView>
    </View>
  </View>
</Modal>

      <BottomNav />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F9' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#1A1A2E', textAlign: 'center', marginTop: 10 },
  subheader: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  content: { flex: 1, paddingHorizontal: 20 },

  filterToggle: { alignItems: 'center', marginBottom: 12 },
  filterToggleText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },

  filterCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: '#EEEEF2', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1A1A2E',
  },
  chipScroll: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#EEEEF2', backgroundColor: '#FFF', marginRight: 8,
  },
  chipActive: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },

  generateBtn: { backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  card: {
    backgroundColor: '#FFF', borderRadius: 14, marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  recipeImage: { width: '100%', height: 160, backgroundColor: '#F0F0F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 6 },
  recipeTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', flex: 1, marginRight: 8 },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  scoreText: { fontSize: 11, fontWeight: '600' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginBottom: 10 },
  metaBadge: { backgroundColor: '#F6F7F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  metaText: { fontSize: 11, color: '#666', fontWeight: '500' },

  ingredientSection: { paddingHorizontal: 14, marginBottom: 8 },
  fromInventoryLabel: { fontSize: 12, fontWeight: '600', color: '#2E7D32', marginBottom: 2 },
  extraLabel: { fontSize: 12, fontWeight: '600', color: '#F57F17', marginBottom: 2 },
  ingredientList: { fontSize: 13, color: '#555', lineHeight: 20 },

  dietRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginBottom: 8 },
  dietBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dietText: { fontSize: 10, color: '#1565C0', fontWeight: '600' },

  expandHint: { textAlign: 'center', fontSize: 11, color: '#BBB', paddingBottom: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', flex: 1, marginRight: 10 },
modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F6F7F9', justifyContent: 'center', alignItems: 'center' },
modalCloseText: { fontSize: 14, color: '#888', fontWeight: '600' },
modalImage: { width: '100%', height: 200, borderRadius: 14, marginBottom: 16 },
modalMeta: { flexDirection: 'row', gap: 12, marginBottom: 20 },
modalMetaText: { fontSize: 13, color: '#666', fontWeight: '500', backgroundColor: '#F6F7F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
modalSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 8, marginTop: 12 },
ingredientItem: { fontSize: 14, color: '#555', lineHeight: 24 },
instructionText: { fontSize: 14, color: '#555', lineHeight: 22 },
});