class Product < ActiveRecord::Base
  attr_accessible :brand, :category, :description, :name, :price
  has_many :reviews
end
