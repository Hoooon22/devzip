import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';
import styles from './styles';

const TodoItem = ({ todo, onToggle, onDelete }) => {
  return (
    <View style={styles.todoItem} accessible={true} accessibilityRole="checkbox" accessibilityState={{ checked: todo.completed }}>
      <Pressable 
        style={styles.todoCheckbox}
        onPress={() => onToggle(todo.id)}
        accessible={true}
        accessibilityLabel={todo.completed ? "완료된 작업" : "미완료 작업"}
        accessibilityHint="두 번 탭하면 완료 상태를 토글합니다"
      >
        <Ionicons 
          name={todo.completed ? 'checkmark-circle' : 'ellipse-outline'} 
          size={24} 
          color={todo.completed ? '#4CAF50' : '#757575'} 
        />
      </Pressable>
      
      <Text 
        style={[styles.todoText, todo.completed && styles.todoTextCompleted]}
        accessible={true}
        accessibilityLabel={`할 일: ${todo.text}`}
      >
        {todo.text}
      </Text>
      
      <TouchableOpacity
        style={styles.todoDelete}
        onPress={() => onDelete(todo.id)}
        accessible={true}
        accessibilityLabel="할 일 삭제"
        accessibilityHint="두 번 탭하면 이 할 일을 삭제합니다"
      >
        <Ionicons name="trash-outline" size={22} color="#F44336" />
      </TouchableOpacity>
    </View>
  );
};

TodoItem.propTypes = {
  todo: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.string.isRequired,
    completed: PropTypes.bool.isRequired
  }).isRequired,
  onToggle: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default TodoItem;